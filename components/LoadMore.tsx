"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReleaseCard from "./ReleaseCard";
import type { LatestCard } from "@/lib/release-pages";

/**
 * Homepage load-more: auto-loads the next page when the sentinel scrolls
 * into view, with a button fallback (and no-JS… nothing — first 20 cards
 * are server-rendered, crawlers never need this). Appended batches carry
 * no in-feed units; page one already has header/footer/in-feed inventory.
 */
export default function LoadMore({ initialHasMore }: { initialHasMore: boolean }) {
  const [cards, setCards] = useState<LatestCard[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/releases?page=${page + 1}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { cards: LatestCard[]; hasMore: boolean };
      setCards((prev) => [...prev, ...data.cards]);
      setPage((p) => p + 1);
      setHasMore(data.hasMore && data.cards.length > 0);
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [page, loading]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void load();
      },
      { rootMargin: "600px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, load, cards.length]);

  return (
    <>
      {cards.map((c) => (
        <ReleaseCard key={c.id} card={c} />
      ))}
      {hasMore && (
        <div ref={sentinelRef} className="col-span-full flex justify-center py-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded-full border border-zinc-300 px-6 py-2 text-sm font-medium hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            {loading ? "Loading…" : "Load more releases"}
          </button>
        </div>
      )}
    </>
  );
}
