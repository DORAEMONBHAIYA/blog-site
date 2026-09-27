import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import HubPage, { hubLabel } from "@/components/HubPage";
import { breadcrumbSchema } from "@/lib/jsonld";
import { getHubEntries, listHubKeys, type HubKind } from "@/lib/release-pages";
import { SITE_NAME, siteUrl } from "@/lib/site";

const KIND: HubKind = "language";

export const revalidate = 3600;
export const dynamicParams = true;

function canonical(key: string): string {
  return `${siteUrl()}/language/${key}`;
}

export async function generateStaticParams(): Promise<{ language: string }[]> {
  return (await listHubKeys(KIND)).map(({ key }) => ({ language: key }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ language: string }>;
}): Promise<Metadata> {
  const { language } = await params;
  const label = hubLabel(KIND, language);
  return {
    title: `${label}-language streaming releases`,
    description: `Every ${label}-language streaming release date tracked automatically — movies, TV and web series.`,
    alternates: { canonical: canonical(language) },
    openGraph: { title: `${label}-language releases`, url: canonical(language), siteName: SITE_NAME, type: "website" },
  };
}

export default async function LanguageHubPage({
  params,
}: {
  params: Promise<{ language: string }>;
}) {
  const { language } = await params;
  const entries = await getHubEntries(KIND, language);
  if (entries.length === 0) notFound();
  const label = hubLabel(KIND, language);
  const url = canonical(language);
  const schemas = [
    breadcrumbSchema([
      { name: "Home", url: siteUrl() },
      { name: "Languages", url: `${siteUrl()}/language` },
      { name: label, url },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `${label}-language streaming releases`,
      itemListElement: entries.map((e, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${siteUrl()}/title/${e.slug}/${e.country.toLowerCase()}`,
        name: e.name,
      })),
    },
  ];
  return (
    <>
      {schemas.map((s, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }} />
      ))}
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-zinc-500">
        <Link href="/" className="hover:underline">Home</Link> ›{" "}
        <Link href="/language" className="hover:underline">Languages</Link> › {label}
      </nav>
      <HubPage label={`${label}-language releases`} entries={entries} />
    </>
  );
}
