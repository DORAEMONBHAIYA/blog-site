import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import HubPage, { hubLabel } from "@/components/HubPage";
import { breadcrumbSchema } from "@/lib/jsonld";
import { getHubEntries, listHubKeys, type HubKind } from "@/lib/release-pages";
import { SITE_NAME, siteUrl } from "@/lib/site";

const KIND: HubKind = "platform";

export const revalidate = 3600;
export const dynamicParams = true;

function canonical(key: string): string {
  return `${siteUrl()}/platform/${key}`;
}

export async function generateStaticParams(): Promise<{ platform: string }[]> {
  return (await listHubKeys(KIND)).map(({ key }) => ({ platform: key }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ platform: string }>;
}): Promise<Metadata> {
  const { platform } = await params;
  const label = hubLabel(KIND, platform);
  return {
    title: `${label} releases`,
    description: `Every ${label} streaming release date tracked automatically — movies, TV and web series.`,
    alternates: { canonical: canonical(platform) },
    openGraph: { title: `${label} releases`, url: canonical(platform), siteName: SITE_NAME, type: "website" },
  };
}

export default async function PlatformHubPage({
  params,
}: {
  params: Promise<{ platform: string }>;
}) {
  const { platform } = await params;
  const entries = await getHubEntries(KIND, platform);
  if (entries.length === 0) notFound();
  const label = hubLabel(KIND, platform);
  const url = canonical(platform);
  const schemas = [
    breadcrumbSchema([
      { name: "Home", url: siteUrl() },
      { name: "Platforms", url: `${siteUrl()}/platform` },
      { name: label, url },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `${label} releases`,
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
        <Link href="/platform" className="hover:underline">Platforms</Link> › {label}
      </nav>
      <HubPage label={`${label} releases`} entries={entries} />
    </>
  );
}
