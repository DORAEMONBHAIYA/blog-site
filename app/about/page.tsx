import type { Metadata } from "next";
import { SITE_NAME, TMDB_ATTRIBUTION } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: `How ${SITE_NAME} works: an automated, TMDB-data-driven streaming release tracker with no manual editorial step.`,
};

export default function AboutPage() {
  return (
    <article className="max-w-3xl">
      <h1 className="text-3xl font-bold tracking-tight">
        About {SITE_NAME}
      </h1>
      <p className="mt-4">
        {SITE_NAME} is a fully automated release-date tracker for movies, TV
        shows and web series across global streaming platforms (Netflix, Prime
        Video, Disney+ and more) and India-specific platforms (JioHotstar,
        SonyLIV, Zee5), including Hindi, Tamil, Telugu, Malayalam and Bengali
        language variants.
      </p>
      <h2 className="mt-8 text-xl font-semibold">Where the data comes from</h2>
      <p className="mt-2">
        Every fact on every page — title, platform, country, language, release
        date, genres, overview — originates from the TMDB API (including its
        licensed watch-provider data). Article text is generated from that
        structured data only; nothing is copied from other publishers, and the
        model is instructed to omit anything not present in the source data
        rather than invent it. {TMDB_ATTRIBUTION}
      </p>
      <h2 className="mt-8 text-xl font-semibold">How pages are made</h2>
      <p className="mt-2">
        A scheduled pipeline discovers new releases, generates a short factual
        article with meta tags, FAQ and structured data, stores it in a
        database, and publishes it — with no human writing, tagging or
        publishing step. Pages are server-rendered so search and AI crawlers
        can read them directly.
      </p>
      <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
        Last updated: this page is static and describes the pipeline itself.
        Title pages carry their own per-page freshness dates.
      </p>
    </article>
  );
}
