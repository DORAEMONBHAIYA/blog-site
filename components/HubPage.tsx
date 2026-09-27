import Link from "next/link";
import { Fragment } from "react";
import { InFeedBanner } from "./AdBanner";
import type { HubEntry, HubKind } from "@/lib/release-pages";
import { COUNTRY_LABELS, LANGUAGE_LABELS, platformLabel } from "@/lib/site";

export function hubLabel(kind: HubKind, key: string): string {
  if (kind === "platform") return platformLabel(key);
  if (kind === "country") return COUNTRY_LABELS[key.toUpperCase()] ?? key;
  return LANGUAGE_LABELS[key] ?? key;
}

/** Shared hub shell: strong rows first, thin-flagged rows last (never hidden). */
export default function HubPage({
  label,
  entries,
}: {
  label: string;
  entries: HubEntry[];
}) {
  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold tracking-tight">{label}</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        {entries.length} streaming release{entries.length === 1 ? "" : "s"} tracked automatically.
      </p>
      <ul className="mt-6 space-y-4">
        {entries.map((e, i) => (
          <Fragment key={e.releaseId}>
            <li
              className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
            >
            <Link
              href={`/title/${e.slug}/${e.country.toLowerCase()}`}
              className="font-medium hover:underline"
            >
              {e.name}
            </Link>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {platformLabel(e.platform)} · {COUNTRY_LABELS[e.country] ?? e.country}
              {e.releaseDate ? ` · ${e.releaseDate}` : ""}
            </p>
            {e.metaDescription && <p className="mt-2 text-sm">{e.metaDescription}</p>}
            </li>
            {(i + 1) % 3 === 0 && <InFeedBanner />}
          </Fragment>
        ))}
      </ul>
    </div>
  );
}
