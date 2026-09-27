import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/lib/db";
import { COUNTRY_LABELS, platformLabel } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  return {
    title: query ? `Search: ${query}` : "Search titles",
    description: query
      ? `Streaming releases matching "${query}".`
      : "Search streaming release dates by title.",
    alternates: { canonical: "/search" },
  };
}

interface Hit {
  slug: string;
  name: string;
  country: string;
  platform: string;
  releaseDate: string | null;
  metaDescription: string | null;
}

async function searchTitles(query: string): Promise<Hit[]> {
  const db = getDb();
  const { data, error } = await db
    .from("releases")
    .select("country, platform, release_date, titles!inner(slug, name), generated_content(meta_description)")
    .eq("processed", true)
    .ilike("titles.name", `%${query.replace(/[%_\\]/g, "\\$&")}%`)
    .order("release_date", { ascending: false, nullsFirst: false })
    .limit(40);
  if (error || !data) return [];
  // One row per title+country (same dedupe as the homepage).
  const seen = new Set<string>();
  const out: Hit[] = [];
  for (const r of data as unknown as {
    country: string;
    platform: string;
    release_date: string | null;
    titles: { slug: string; name: string };
    generated_content: { meta_description: string | null } | null;
  }[]) {
    const key = `${r.titles.slug}/${r.country}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      slug: r.titles.slug,
      name: r.titles.name,
      country: r.country,
      platform: r.platform,
      releaseDate: r.release_date,
      metaDescription: r.generated_content?.meta_description ?? null,
    });
    if (out.length >= 20) break;
  }
  return out;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim().slice(0, 80);
  const hits = query.length >= 2 ? await searchTitles(query) : [];

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold tracking-tight">
        {query ? `Results for "${query}"` : "Search titles"}
      </h1>
      <form action="/search" method="get" role="search" className="mt-4">
        <input
          type="search"
          name="q"
          defaultValue={query}
          required
          minLength={2}
          maxLength={80}
          placeholder="Search titles…"
          aria-label="Search titles"
          className="w-full max-w-md rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
        />
      </form>

      {query.length >= 2 && (
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          {hits.length === 0
            ? "No matching releases yet — new titles appear automatically as the pipeline ingests them."
            : `${hits.length} match${hits.length === 1 ? "" : "es"}`}
        </p>
      )}

      <ul className="mt-4 space-y-4">
        {hits.map((h) => (
          <li
            key={`${h.slug}-${h.country}`}
            className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <Link href={`/title/${h.slug}/${h.country.toLowerCase()}`} className="font-medium hover:underline">
              {h.name}
            </Link>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {platformLabel(h.platform)} · {COUNTRY_LABELS[h.country] ?? h.country}
              {h.releaseDate ? ` · ${h.releaseDate}` : ""}
            </p>
            {h.metaDescription && <p className="mt-2 text-sm">{h.metaDescription}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
