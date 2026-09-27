import Link from "next/link";
import { Fragment } from "react";
import { InFeedBanner } from "@/components/AdBanner";
import LoadMore from "@/components/LoadMore";
import ReleaseCard from "@/components/ReleaseCard";
import { getLatestCards } from "@/lib/release-pages";

export const revalidate = 3600;

const PER_PAGE = 20;

export default async function Home() {
  let cards: Awaited<ReturnType<typeof getLatestCards>>["cards"] = [];
  let hasMore = false;
  let dbError: string | null = null;
  try {
    const res = await getLatestCards(1, PER_PAGE);
    cards = res.cards;
    hasMore = res.hasMore;
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
      ) : cards.length === 0 ? (
        <p className="mt-8 rounded border border-zinc-200 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
          No releases published yet — the ingestion pipeline (Phase 1) has not
          run. Once it does, the latest titles will list here automatically.
        </p>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {cards.map((c, i) => (
            <Fragment key={c.id}>
              <ReleaseCard card={c} />
              {/* Single in-feed slot (after 3rd card): the native container id
                  is key-derived, so repeats would race — one per page. */}
              {i === 2 && <InFeedBanner />}
            </Fragment>
          ))}
          <LoadMore initialHasMore={hasMore} />
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
