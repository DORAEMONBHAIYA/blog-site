import Image from "next/image";
import Link from "next/link";
import AdSlot from "./AdSlot";
import type { ReleasePageRow } from "@/lib/db";
import { posterUrl, type RelatedRow } from "@/lib/release-pages";
import { COUNTRY_LABELS, LANGUAGE_LABELS, platformLabel } from "@/lib/site";

/**
 * Shared title-page article shell (SEO_GEO.md):
 * - FAQ as literal <h3>/<p> pairs (AI-engine liftable)
 * - "Last updated" freshness date
 * - hub links (spans until Phase 4 hub routes exist — no 404 links)
 * - related titles, variant switcher, in-article ad slot
 */
export default function TitleArticle({
  row,
  hindiAlt,
  variants,
  related,
  lastUpdated,
  breadcrumb,
}: {
  row: ReleasePageRow;
  hindiAlt?: ReleasePageRow | null;
  variants: { country: string; url: string; current: boolean }[];
  related: RelatedRow[];
  lastUpdated: string;
  breadcrumb: { name: string; url: string }[];
}) {
  const content = row.generated_content;
  const poster = posterUrl(row.titles.poster_path);
  return (
    <article className="max-w-3xl">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-zinc-500">
        {breadcrumb.map((b, i) => (
          <span key={b.url}>
            {i > 0 && " › "}
            {i === breadcrumb.length - 1 ? (
              b.name
            ) : (
              <Link href={b.url} className="hover:underline">
                {b.name}
              </Link>
            )}
          </span>
        ))}
      </nav>

      <div className="flex gap-5">
        {poster && (
          <Image
            src={poster}
            alt={`${row.titles.name} poster`}
            width={150}
            height={225}
            className="h-[225px] w-[150px] rounded object-cover"
          />
        )}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{row.titles.name}</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            {row.titles.media_type === "movie" ? "Movie" : "TV series"} ·{" "}
            <Link href={`/platform/${row.platform}`} className="hover:underline">
              {platformLabel(row.platform)}
            </Link>{" "}
            ·{" "}
            <Link href={`/country/${row.country.toLowerCase()}`} className="hover:underline">
              {COUNTRY_LABELS[row.country] ?? row.country}
            </Link>
            {row.release_date ? ` · ${row.release_date}` : ""}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Last updated: {lastUpdated}
          </p>
        </div>
      </div>

      {variants.length > 1 && (
        <p className="mt-4 text-sm">
          Available in:{" "}
          {variants.map((v) => (
            <span key={v.country} className="mr-2">
              {v.current ? (
                <strong>{COUNTRY_LABELS[v.country] ?? v.country}</strong>
              ) : (
                <Link href={v.url} className="underline">
                  {COUNTRY_LABELS[v.country] ?? v.country}
                </Link>
              )}
            </span>
          ))}
        </p>
      )}

      <div className="mt-6 space-y-4 leading-7">
        {(content?.body ?? "")
          .split(/\n{2,}/)
          .map((p) => p.trim())
          .filter(Boolean)
          .map((p, i) => (
            <p key={i}>{p}</p>
          ))}
      </div>

      <div className="my-6">
        <AdSlot slot="in-article" className="h-[120px]" />
      </div>

      {hindiAlt?.generated_content && (
        <section lang="hi" className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-800">
          <h2 className="text-xl font-semibold">हिंदी में पढ़ें</h2>
          <div className="mt-3 space-y-4 leading-7">
            {(hindiAlt.generated_content.body ?? "")
              .split(/\n{2,}/)
              .map((p) => p.trim())
              .filter(Boolean)
              .map((p, i) => (
                <p key={i}>{p}</p>
              ))}
          </div>
        </section>
      )}

      {(content?.faq?.length ?? 0) > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold">Frequently asked questions</h2>
          {content!.faq.map((f, i) => (
            <div key={i} className="mt-4">
              <h3 className="font-medium">{f.question}</h3>
              <p className="mt-1 text-zinc-700 dark:text-zinc-300">{f.answer}</p>
            </div>
          ))}
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-800">
          <h2 className="text-xl font-semibold">Related releases</h2>
          <ul className="mt-3 space-y-2">
            {related.map((r) => (
              <li key={`${r.slug}-${r.country}`}>
                <Link
                  href={`/title/${r.slug}/${r.country.toLowerCase()}`}
                  className="hover:underline"
                >
                  {r.name}
                </Link>{" "}
                <span className="text-sm text-zinc-500">
                  · {COUNTRY_LABELS[r.country] ?? r.country}
                  {r.release_date ? ` · ${r.release_date}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {row.titles.genres.length > 0 && (
        <p className="mt-6 text-sm text-zinc-500">
          Genres: {row.titles.genres.join(", ")} · Language:{" "}
          {LANGUAGE_LABELS[row.language] ?? row.language}
        </p>
      )}
    </article>
  );
}
