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
  pickPrimaryRow,
  titleUrl,
} from "@/lib/release-pages";
import { SITE_NAME, siteUrl } from "@/lib/site";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const db = getDb();
  const { data } = await db
    .from("releases")
    .select("titles!inner(slug)")
    .eq("processed", true)
    .limit(5000);
  const slugs = new Set(
    ((data ?? []) as unknown as { titles: { slug: string } }[]).map(
      (r) => r.titles.slug,
    ),
  );
  return [...slugs].map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const pub = await getPublishedTitle(slug);
  if (!pub) return {};
  const primary = pickPrimaryRow(pub.releases);
  const content = primary.generated_content;
  return {
    title: content?.meta_title ?? `${pub.title.name} streaming release date`,
    description:
      content?.meta_description ??
      `${pub.title.name} streaming release dates across platforms and countries.`,
    alternates: {
      canonical: titleUrl(slug),
      languages: hreflangMap(slug, pub.releases),
    },
    openGraph: {
      title: content?.meta_title ?? pub.title.name,
      description: content?.meta_description ?? undefined,
      url: titleUrl(slug),
      siteName: SITE_NAME,
      type: "article",
    },
  };
}

export default async function TitlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const pub = await getPublishedTitle(slug);
  if (!pub) notFound();
  const primary = pickPrimaryRow(pub.releases);
  const related = await getRelated(primary.platform, pub.title.id);
  const lastUpdated = pub.releases
    .map((r) => r.updated_at.slice(0, 10))
    .sort()
    .reverse()[0];
  const canonical = titleUrl(slug);
  const schemas = [
    titleSchema(primary, canonical),
    ...(primary.generated_content?.faq?.length
      ? [faqSchema(primary.generated_content.faq)]
      : []),
    breadcrumbSchema([
      { name: "Home", url: siteUrl() },
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
        row={primary}
        variants={pub.countries.map((c) => ({
          country: c,
          url: countryUrl(slug, c),
          current: false,
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
