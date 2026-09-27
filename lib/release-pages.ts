import { getDb, type ReleasePageRow } from "./db";
import { siteUrl } from "./site";

/** A title with all its published (processed + has content) releases. */
export interface PublishedTitle {
  title: ReleasePageRow["titles"];
  releases: ReleasePageRow[];
  countries: string[];
}

export async function getPublishedTitle(slug: string): Promise<PublishedTitle | null> {
  const db = getDb();
  const { data: title, error: tErr } = await db
    .from("titles")
    .select("*")
    .eq("slug", slug)
    .single();
  if (tErr || !title) return null;
  const { data, error } = await db
    .from("releases")
    .select("*, titles!inner(*), generated_content!inner(*)")
    .eq("title_id", (title as { id: string }).id)
    .eq("processed", true)
    .order("release_date", { ascending: false, nullsFirst: false });
  if (error || !data || data.length === 0) return null;
  const releases = data as unknown as ReleasePageRow[];
  return {
    title: releases[0].titles,
    releases,
    countries: [...new Set(releases.map((r) => r.country))].sort(),
  };
}

/** Preferred row for a country page: English row first, else first available. */
export function pickCountryRow(releases: ReleasePageRow[], country: string): ReleasePageRow | null {
  const rows = releases.filter((r) => r.country === country);
  return rows.find((r) => r.language === "en") ?? rows[0] ?? null;
}

/** Primary row for the global page: IN row if present, else first release. */
export function pickPrimaryRow(releases: ReleasePageRow[]): ReleasePageRow {
  return releases.find((r) => r.country === "IN") ?? releases[0];
}

export function titleUrl(slug: string): string {
  return `${siteUrl()}/title/${slug}`;
}

export function countryUrl(slug: string, country: string): string {
  return `${siteUrl()}/title/${slug}/${country.toLowerCase()}`;
}

/** hreflang map: "en-US"-style keys per variant + x-default to the global page. */
export function hreflangMap(slug: string, releases: ReleasePageRow[]): Record<string, string> {
  const map: Record<string, string> = { "x-default": titleUrl(slug) };
  for (const r of releases) {
    map[`${r.language}-${r.country}`] = countryUrl(slug, r.country);
  }
  return map;
}

export interface RelatedRow {
  slug: string;
  name: string;
  country: string;
  release_date: string | null;
  meta_description: string | null;
}

/** 2-3 related titles: same platform, closest release dates, excluding self. */
export async function getRelated(
  platform: string,
  titleId: string,
  limit = 3,
): Promise<RelatedRow[]> {
  const db = getDb();
  const { data, error } = await db
    .from("releases")
    .select("country, release_date, titles!inner(id, slug, name), generated_content(meta_description)")
    .eq("platform", platform)
    .eq("processed", true)
    .neq("title_id", titleId)
    .order("release_date", { ascending: false, nullsFirst: false })
    .limit(12);
  if (error || !data) return [];
  const seen = new Set<string>();
  const out: RelatedRow[] = [];
  for (const r of data as unknown as {
    country: string;
    release_date: string | null;
    titles: { id: string; slug: string; name: string };
    generated_content: { meta_description: string | null } | null;
  }[]) {
    if (seen.has(r.titles.id)) continue;
    seen.add(r.titles.id);
    out.push({
      slug: r.titles.slug,
      name: r.titles.name,
      country: r.country,
      release_date: r.release_date,
      meta_description: r.generated_content?.meta_description ?? null,
    });
    if (out.length >= limit) break;
  }
  return out;
}

export function posterUrl(posterPath: string | null): string | null {
  return posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : null;
}

export type HubKind = "platform" | "country" | "language";

export interface HubEntry {
  releaseId: string;
  slug: string;
  name: string;
  country: string;
  language: string;
  platform: string;
  releaseDate: string | null;
  metaDescription: string | null;
  thin: boolean;
}

/**
 * Hub listing: every published release for the facet, with thin-flagged
 * rows sorted LAST so hubs never lead crawlers to the weakest pages
 * first (thin rows stay published and linked — just never prominent).
 */
export async function getHubEntries(kind: HubKind, key: string): Promise<HubEntry[]> {
  const db = getDb();
  const column = kind === "platform" ? "platform" : kind === "country" ? "country" : "language";
  const { data, error } = await db
    .from("releases")
    .select("id, country, language, platform, release_date, titles!inner(slug, name), generated_content!inner(meta_description, quality_flags)")
    .eq("processed", true)
    .eq(column, key)
    .order("release_date", { ascending: false, nullsFirst: false })
    .limit(500);
  if (error || !data) return [];
  const entries = (data as unknown as {
    id: string;
    country: string;
    language: string;
    platform: string;
    release_date: string | null;
    titles: { slug: string; name: string };
    generated_content: { meta_description: string | null; quality_flags: string[] };
  }[]).map((r) => ({
    releaseId: r.id,
    slug: r.titles.slug,
    name: r.titles.name,
    country: r.country,
    language: r.language,
    platform: r.platform,
    releaseDate: r.release_date,
    metaDescription: r.generated_content.meta_description,
    thin: (r.generated_content.quality_flags ?? []).includes("thin_body"),
  }));
  entries.sort((a, b) => Number(a.thin) - Number(b.thin));
  return entries;
}

/** All facet values that have at least one published release. */
export async function listHubKeys(kind: HubKind): Promise<{ key: string; count: number }[]> {
  const db = getDb();
  const column = kind === "platform" ? "platform" : kind === "country" ? "country" : "language";
  const { data, error } = await db
    .from("releases")
    .select("id, platform, country, language")
    .eq("processed", true)
    .limit(5000);
  if (error || !data) return [];
  const counts = new Map<string, number>();
  for (const r of data as unknown as { platform: string; country: string; language: string }[]) {
    const k = column === "platform" ? r.platform : column === "country" ? r.country : r.language;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}
