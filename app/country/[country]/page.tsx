import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import HubPage, { hubLabel } from "@/components/HubPage";
import { breadcrumbSchema } from "@/lib/jsonld";
import { getHubEntries, listHubKeys, type HubKind } from "@/lib/release-pages";
import { SITE_NAME, siteUrl } from "@/lib/site";

const KIND: HubKind = "country";

export const revalidate = 3600;
export const dynamicParams = true;

function canonical(key: string): string {
  return `${siteUrl()}/country/${key.toLowerCase()}`;
}

export async function generateStaticParams(): Promise<{ country: string }[]> {
  return (await listHubKeys(KIND)).map(({ key }) => ({ country: key.toLowerCase() }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ country: string }>;
}): Promise<Metadata> {
  const { country } = await params;
  const key = country.toUpperCase();
  const label = hubLabel(KIND, key);
  return {
    title: `${label} streaming releases`,
    description: `Every streaming release date in ${label} tracked automatically — movies, TV and web series.`,
    alternates: { canonical: canonical(key) },
    openGraph: { title: `${label} streaming releases`, url: canonical(key), siteName: SITE_NAME, type: "website" },
  };
}

export default async function CountryHubPage({
  params,
}: {
  params: Promise<{ country: string }>;
}) {
  const { country } = await params;
  const key = country.toUpperCase();
  const entries = await getHubEntries(KIND, key);
  if (entries.length === 0) notFound();
  const label = hubLabel(KIND, key);
  const url = canonical(key);
  const schemas = [
    breadcrumbSchema([
      { name: "Home", url: siteUrl() },
      { name: "Countries", url: `${siteUrl()}/country` },
      { name: label, url },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `${label} streaming releases`,
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
        <Link href="/country" className="hover:underline">Countries</Link> › {label}
      </nav>
      <HubPage label={`${label} streaming releases`} entries={entries} />
    </>
  );
}
