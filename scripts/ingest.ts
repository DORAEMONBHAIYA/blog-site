/**
 * Phase 1 — TMDB ingestion (ROADMAP.md).
 *
 *   npm run ingest [-- --dry-run] [--max-titles=150] [--pages=2]
 *                  [--countries=IN,US,GB,CA,AU]
 *
 * Pipeline: discover recent/upcoming movies+TV per region (streaming-only
 * via with_watch_monetization_types=flatrate) -> dedupe -> one
 * /watch/providers call per title (covers ALL countries in one response)
 * -> upsert titles (on tmdb_id+media_type) -> insert new release rows
 * (title x platform x country x language), skipping existing variants.
 *
 * Idempotent: re-runs only add genuinely new rows. Per-title failures are
 * logged and skipped (partial progress is acceptable per REQUIREMENTS.md);
 * only missing env / total DB failure is fatal.
 */

import dotenv from "dotenv";
// Load local env for tsx runs (Next.js loads these itself for app code).
// Existing exported vars win — dotenv never overrides them.
dotenv.config({ path: ".env.local" });
dotenv.config();

import { getDb, slugify } from "../lib/db";
import {
  TARGET_COUNTRIES,
  TMDB_BASE,
  languagesFor,
  mapProvider,
  sleep,
  tmdbGet,
  toISODate,
  type CountryProviders,
  type DiscoverMovie,
  type DiscoverTv,
  type MediaType,
} from "./tmdb";

interface Discovered {
  mediaType: MediaType;
  tmdbId: number;
  name: string;
  originalLanguage: string;
  genreIds: number[];
  overview: string;
  posterPath: string | null;
  releaseDate: string;
  voteAverage: number;
}

interface Args {
  dryRun: boolean;
  verbose: boolean;
  maxTitles: number;
  pages: number;
  countries: string[];
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    dryRun: false,
    verbose: false,
    maxTitles: 150,
    pages: 2,
    countries: TARGET_COUNTRIES,
  };
  for (const a of argv) {
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--verbose") args.verbose = true;
    else if (a.startsWith("--max-titles="))
      args.maxTitles = Math.max(1, Number(a.split("=")[1]) || 150);
    else if (a.startsWith("--pages="))
      args.pages = Math.min(5, Math.max(1, Number(a.split("=")[1]) || 2));
    else if (a.startsWith("--countries=")) {
      const list = a
        .split("=")[1]
        .split(",")
        .map((c) => c.trim().toUpperCase())
        .filter(Boolean);
      if (list.length > 0) args.countries = list;
    }
  }
  return args;
}

async function discover(
  mediaType: MediaType,
  country: string,
  from: string,
  to: string,
  pages: number,
  apiKey: string,
): Promise<Discovered[]> {
  const out: Discovered[] = [];
  const isMovie = mediaType === "movie";
  for (let page = 1; page <= pages; page++) {
    const data = await tmdbGet<{
      results: (DiscoverMovie | DiscoverTv)[];
      total_pages: number;
    }>(`/discover/${mediaType}`, {
      include_adult: "false",
      sort_by: isMovie ? "primary_release_date.desc" : "first_air_date.desc",
      ...(isMovie
        ? {
            "primary_release_date.gte": from,
            "primary_release_date.lte": to,
          }
        : { "first_air_date.gte": from, "first_air_date.lte": to }),
      watch_region: country,
      with_watch_monetization_types: "flatrate",
      page,
    }, apiKey);
    for (const r of data.results ?? []) {
      const name =
        (r as DiscoverMovie).title ?? (r as DiscoverTv).name ?? "";
      if (!name) continue;
      const releaseDate =
        (r as DiscoverMovie).release_date ??
        (r as DiscoverTv).first_air_date ??
        "";
      out.push({
        mediaType,
        tmdbId: r.id,
        name,
        originalLanguage: r.original_language || "en",
        genreIds: r.genre_ids ?? [],
        overview: r.overview || "",
        posterPath: r.poster_path,
        releaseDate,
        voteAverage: r.vote_average ?? 0,
      });
    }
    if (page >= (data.total_pages ?? 1)) break;
    await sleep(250);
  }
  return out;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    console.error("FATAL: TMDB_API_KEY is not set (see .env.example).");
    process.exit(2);
  }

  const now = new Date();
  const from = toISODate(new Date(now.getTime() - 14 * 864e5));
  const to = toISODate(new Date(now.getTime() + 60 * 864e5));
  console.log(
    `ingest: window ${from}..${to} countries=${args.countries.join(",")} ` +
      `pages=${args.pages} maxTitles=${args.maxTitles}` +
      (args.dryRun ? " DRY-RUN" : ""),
  );
  console.log(`ingest: source ${TMDB_BASE} (licensed watch/providers data)`);

  // Genre id -> name maps (one call each, avoids per-title detail calls).
  // Generous retries: a run dies without these, so outlast a bad-network window.
  const [movieGenres, tvGenres] = await Promise.all([
    tmdbGet<{ genres: { id: number; name: string }[] }>(
      "/genre/movie/list",
      { language: "en-US" },
      apiKey,
      8,
    ),
    tmdbGet<{ genres: { id: number; name: string }[] }>(
      "/genre/tv/list",
      { language: "en-US" },
      apiKey,
      8,
    ),
  ]);
  const genreMaps: Record<MediaType, Map<number, string>> = {
    movie: new Map(movieGenres.genres.map((g) => [g.id, g.name])),
    tv: new Map(tvGenres.genres.map((g) => [g.id, g.name])),
  };

  // Discover per region (IN first so the maxTitles cap favors the wedge).
  const ordered = [
    ...args.countries.filter((c) => c === "IN"),
    ...args.countries.filter((c) => c !== "IN"),
  ];
  const seen = new Set<string>();
  const titles: Discovered[] = [];
  for (const country of ordered) {
    for (const mediaType of ["movie", "tv"] as MediaType[]) {
      try {
        const found = await discover(
          mediaType,
          country,
          from,
          to,
          args.pages,
          apiKey,
        );
        for (const t of found) {
          const key = `${t.mediaType}:${t.tmdbId}`;
          if (seen.has(key)) continue;
          seen.add(key);
          titles.push(t);
          if (titles.length >= args.maxTitles) break;
        }
      } catch (e) {
        console.error(
          `ingest: discover ${mediaType}/${country} failed, continuing:`,
          e instanceof Error ? e.message : e,
        );
      }
      if (titles.length >= args.maxTitles) break;
      await sleep(250);
    }
    if (titles.length >= args.maxTitles) break;
  }
  console.log(`ingest: ${titles.length} unique titles discovered`);

  const db = args.dryRun ? null : getDb();
  let newTitles = 0;
  let newReleases = 0;
  let skippedVariants = 0;
  let failedTitles = 0;
  const unmappedProviders = new Set<string>();

  for (const t of titles) {
    try {
      const prov = await tmdbGet<{ results: Record<string, CountryProviders> }>(
        `/${t.mediaType}/${t.tmdbId}/watch/providers`,
        {},
        apiKey,
      );
      const genres = t.genreIds
        .map((id) => genreMaps[t.mediaType].get(id))
        .filter((g): g is string => !!g);
      const slug = `${slugify(t.name)}-${t.mediaType}-${t.tmdbId}`;

      // Collect release rows across our target countries.
      const releaseRows: {
        platform: string;
        country: string;
        language: string;
      }[] = [];
      for (const country of args.countries) {
        const entry = prov.results?.[country];
        const flatrate = entry?.flatrate ?? [];
        const platforms = new Set<string>();
        for (const p of flatrate) {
          const mapped = mapProvider(p.provider_name);
          if (mapped) platforms.add(mapped);
          else unmappedProviders.add(p.provider_name);
        }
        for (const platform of platforms) {
          for (const language of languagesFor(
            country,
            t.originalLanguage,
          )) {
            releaseRows.push({ platform, country, language });
          }
        }
      }
      if (releaseRows.length === 0) {
        if (args.verbose) {
          console.log(`- ${t.name} (${t.mediaType}/${t.tmdbId} lang=${t.originalLanguage}): no tracked streaming`);
        }
        await sleep(250);
        continue; // streaming nowhere we track
      }
      if (args.verbose) {
        const byCountry = new Map<string, string[]>();
        for (const r of releaseRows) {
          const list = byCountry.get(r.country) ?? [];
          list.push(`${r.platform}(${r.language})`);
          byCountry.set(r.country, list);
        }
        console.log(
          `- ${t.name} (${t.mediaType}/${t.tmdbId} lang=${t.originalLanguage}): ` +
            [...byCountry.entries()]
              .map(([c, ps]) => `${c}:[${ps.join(" ")}]`)
              .join(" "),
        );
      }

      if (args.dryRun) {
        newTitles++;
        newReleases += releaseRows.length;
        await sleep(250);
        continue;
      }

      const { data: titleRow, error: titleErr } = await db!
        .from("titles")
        .upsert(
          {
            tmdb_id: t.tmdbId,
            media_type: t.mediaType,
            name: t.name,
            slug,
            original_language: t.originalLanguage,
            genres,
            overview: t.overview || null,
            poster_path: t.posterPath,
            vote_average: t.voteAverage,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "tmdb_id,media_type" },
        )
        .select("id")
        .single();
      if (titleErr || !titleRow) {
        throw new Error(`title upsert failed: ${titleErr?.message}`);
      }
      // created fresh vs already present (heuristic: count release insert results below).
      const { data: inserted, error: relErr } = await db!
        .from("releases")
        .upsert(
          releaseRows.map((r) => ({
            title_id: (titleRow as { id: string }).id,
            platform: r.platform,
            country: r.country,
            language: r.language,
            release_date: t.releaseDate || null,
          })),
          { onConflict: "title_id,platform,country,language", ignoreDuplicates: true },
        )
        .select("id");
      if (relErr) throw new Error(`release upsert failed: ${relErr.message}`);
      const added = inserted?.length ?? 0;
      newReleases += added;
      skippedVariants += releaseRows.length - added;
      newTitles++; // counted as touched; exact new-vs-existing needs a select — kept cheap
    } catch (e) {
      failedTitles++;
      console.error(
        `ingest: title ${t.mediaType}/${t.tmdbId} (${t.name}) skipped:`,
        e instanceof Error ? e.message : e,
      );
    }
    await sleep(250);
  }

  console.log(
    `ingest done: touched=${titles.length} titlesUpserted~${newTitles} ` +
      `newReleases=${newReleases} existingVariants=${skippedVariants} failed=${failedTitles}`,
  );
  if (unmappedProviders.size > 0) {
    console.log(
      `ingest: unmapped flatrate providers skipped: ${[...unmappedProviders].join(", ")}`,
    );
  }
}

main().catch((e) => {
  console.error("FATAL:", e instanceof Error ? e.message : e);
  process.exit(1);
});
