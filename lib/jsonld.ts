import type { ReleasePageRow } from "./db";
import { posterUrl } from "./release-pages";

export function titleSchema(
  row: ReleasePageRow,
  url: string,
): Record<string, unknown> {
  const t = row.titles;
  return {
    "@context": "https://schema.org",
    "@type": t.media_type === "movie" ? "Movie" : "TVSeries",
    name: t.name,
    url,
    ...(t.genres.length > 0 ? { genre: t.genres } : {}),
    ...(row.release_date ? { datePublished: row.release_date } : {}),
    ...(row.generated_content?.meta_description
      ? { description: row.generated_content.meta_description }
      : {}),
    ...(posterUrl(t.poster_path) ? { image: posterUrl(t.poster_path) } : {}),
  };
}

export function faqSchema(
  faq: { question: string; answer: string }[],
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

export function breadcrumbSchema(
  items: { name: string; url: string }[],
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}
