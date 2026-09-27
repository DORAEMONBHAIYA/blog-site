import Link from "next/link";
import { hubLabel } from "./HubPage";
import type { HubKind } from "@/lib/release-pages";
import { listHubKeys } from "@/lib/release-pages";

export default async function HubIndex({ kind, title, blurb }: { kind: HubKind; title: string; blurb: string }) {
  const keys = await listHubKeys(kind);
  const base = kind === "platform" ? "platform" : kind === "country" ? "country" : "language";
  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">{blurb}</p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {keys.map(({ key, count }) => (
          <li key={key} className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <Link
              href={`/${base}/${kind === "country" ? key.toLowerCase() : key}`}
              className="font-medium hover:underline"
            >
              {hubLabel(kind, kind === "country" ? key.toUpperCase() : key)}
            </Link>
            <p className="text-sm text-zinc-500">{count} releases</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
