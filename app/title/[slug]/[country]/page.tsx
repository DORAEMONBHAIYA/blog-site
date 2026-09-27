import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TitleArticle from "@/components/TitleArticle";
import { getDb } from "@/lib/db";
import { breadcrumbSchema, faqSchema, titleSchema } from "@/lib/jsonld";
import {
  countryUrl,
  getPublishedTitle,
  getRelated,
  hreflangMap,
  pickCountryRow,
  titleUrl,
} from "@/lib/release-pages";
import { COUNTRY_LABELS, SITE_NAME } from "@/lib/site";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams(): Promise<
  { slug: string; country: string }[]
> {
  const db = getDb();
  const { data } = await db
    .from("releases")
    .select("country, titles!inner(slug)")
    .eq("processed", true)
    .limit(5000);
  const seen = new Set<string>();
  const out: { slug: string; country: string }[] = [];
  for (const r of (data ?? []) as unknown as {
    country: string;
    titles: { slug: string };
  }[]) {
    const key = `${r.titles.slug}/${r.country.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ slug: r.titles.slug, country: r.country.toLowerCase() });
  }
  return out;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; country: string }>;
}): Promise<Metadata> {
  const { slug, country } = await params;
  const pub = await getPublishedTitle(slug);
  const row = pub && pickCountryRow(pub.releases, country.toUpperCase());
  if (!pub || !row) return {};
  const content = row.generated_content;
  const canonical = titleUrl(slug);
  return {
    title: content?.meta_title ?? `${pub.title.name} release date`,
    description:
      content?.meta_description ??
      `${pub.title.name} streaming release in ${COUNTRY_LABELS[row.country] ?? row.country}.`,
    // SEO_GEO.md: country variants canonicalize to the primary global page.
    alternates: {
      canonical,
      languages: hreflangMap(slug, pub.releases),
    },
    openGraph: {
      title: content?.meta_title ?? pub.title.name,
      description: content?.meta_description ?? undefined,
      url: countryUrl(slug, row.country),
      siteName: SITE_NAME,
      type: "article",
    },
  };
}

export default async function CountryTitlePage({
  params,
}: {
  params: Promise<{ slug: string; country: string }>;
}) {
  const { slug, country } = await params;
  const pub = await getPublishedTitle(slug);
  const row = pub && pickCountryRow(pub.releases, country.toUpperCase());
  if (!pub || !row) notFound();
  const hindiAlt =
    row.country === "IN"
      ? (pub.releases.find(
          (r) => r.country === "IN" && r.language === "hi" && r.id !== row.id && r.generated_content,
        ) ?? null)
      : null;
  const related = await getRelated(row.platform, pub.title.id);
  const lastUpdated = pub.releases
    .map((r) => r.updated_at.slice(0, 10))
    .sort()
    .reverse()[0];
  const canonical = titleUrl(slug);
  const pageUrl = countryUrl(slug, row.country);
  const schemas = [
    titleSchema(row, pageUrl),
    ...(row.generated_content?.faq?.length
      ? [faqSchema(row.generated_content.faq)]
      : []),
    breadcrumbSchema([
      { name: "Home", url: "/" },
      { name: pub.title.name, url: canonical },
    ]),
  ];

  return (
    <>
      {schemas.map((s, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }}
        />
      ))}
      <TitleArticle
        row={row}
        hindiAlt={hindiAlt}
        variants={pub.countries.map((c) => ({
          country: c,
          url: countryUrl(slug, c),
          current: c === row.country,
        }))}
        related={related}
        lastUpdated={lastUpdated}
        breadcrumb={[
          { name: "Home", url: "/" },
          { name: pub.title.name, url: canonical },
        ]}
      />
    </>
  );
}
