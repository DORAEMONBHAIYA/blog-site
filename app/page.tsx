import Link from "next/link";
import { getDb, type ReleasePageRow } from "@/lib/db";
import { COUNTRY_LABELS, platformLabel } from "@/lib/site";

export const revalidate = 3600;

async function getLatestReleases(): Promise<ReleasePageRow[]> {
  const db = getDb();
  const { data, error } = await db
    .from("releases")
    .select("*, titles!inner(*), generated_content(*)")
    .eq("processed", true)
    .order("release_date", { ascending: false, nullsFirst: false })
    .limit(48);
  if (error) throw error;
  // One card per title+country: language variants share a page, so prefer
  // the English row and drop the rest (no duplicate-looking cards).
  const seen = new Set<string>();
  const out: ReleasePageRow[] = [];
  const rows = (data ?? []) as unknown as ReleasePageRow[];
  for (const r of [...rows].sort((a, b) => Number(a.language !== "en") - Number(b.language !== "en"))) {
    const key = `${r.title_id}/${r.country}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out
    .sort((a, b) => (b.release_date ?? "").localeCompare(a.release_date ?? ""))
    .slice(0, 24);
}

export default async function Home() {
  let releases: ReleasePageRow[] = [];
  let dbError: string | null = null;
  try {
    releases = await getLatestReleases();
  } catch (e) {
    dbError = e instanceof Error ? e.message : "Database unavailable";
  }

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">
        New &amp; upcoming streaming releases
      </h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Automatically tracked across global and Indian platforms. New pages
        appear here as the pipeline ingests them — no manual publishing.
      </p>

      {dbError ? (
        <p className="mt-8 rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Release listings are temporarily unavailable — please check back soon.
        </p>
      ) : releases.length === 0 ? (
        <p className="mt-8 rounded border border-zinc-200 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
          No releases published yet — the ingestion pipeline (Phase 1) has not
          run. Once it does, the latest titles will list here automatically.
        </p>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {releases.map((r) => (
            <li
              key={r.id}
              className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <Link
                href={`/title/${r.titles.slug}/${r.country.toLowerCase()}`}
                className="font-medium hover:underline"
              >
                {r.titles.name}
              </Link>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {platformLabel(r.platform)} · {COUNTRY_LABELS[r.country] ?? r.country}
                {r.release_date ? ` · ${r.release_date}` : ""}
              </p>
              {r.generated_content?.meta_description ? (
                <p className="mt-2 text-sm">
                  {r.generated_content.meta_description}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 text-xs text-zinc-500">
        Release data via the TMDB API, refreshed automatically every few
        hours. Browse by <Link href="/platform" className="underline">platform</Link>,{" "}
        <Link href="/country" className="underline">country</Link>, or{" "}
        <Link href="/language" className="underline">language</Link>.
      </p>
    </div>
  );
}
