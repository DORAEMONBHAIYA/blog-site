import Link from "next/link";
import type { LatestCard } from "@/lib/release-pages";
import { COUNTRY_LABELS, platformLabel } from "@/lib/site";

/** Shared release card (server home + client load-more use the same markup). */
export default function ReleaseCard({ card }: { card: LatestCard }) {
  return (
    <li className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <Link href={`/title/${card.slug}/${card.country.toLowerCase()}`} className="font-medium hover:underline">
        {card.name}
      </Link>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        {platformLabel(card.platform)} · {COUNTRY_LABELS[card.country] ?? card.country}
        {card.releaseDate ? ` · ${card.releaseDate}` : ""}
      </p>
      {card.metaDescription ? <p className="mt-2 text-sm">{card.metaDescription}</p> : null}
    </li>
  );
}
