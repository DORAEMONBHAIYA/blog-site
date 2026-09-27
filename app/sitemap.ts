import type { MetadataRoute } from "next";
import { getDb } from "@/lib/db";
import { siteUrl } from "@/lib/site";

export const revalidate = 3600;

/**
 * Live sitemap (SEO_GEO.md): every published URL from one Supabase read —
 * home, about, hub indexes, hub pages, title pages, country variants.
 * Split into sub-sitemaps once past a few thousand URLs (not yet: ~dozens).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const staticEntries: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "hourly" },
    { url: `${base}/about`, changeFrequency: "monthly" },
    { url: `${base}/platform`, changeFrequency: "daily" },
    { url: `${base}/country`, changeFrequency: "daily" },
    { url: `${base}/language`, changeFrequency: "daily" },
  ];

  const db = getDb();
  const { data, error } = await db
    .from("releases")
    .select("platform, country, language, updated_at, titles!inner(slug)")
    .eq("processed", true)
    .limit(10000);
  if (error || !data) return staticEntries;

  const rows = data as unknown as {
    platform: string;
    country: string;
    language: string;
    updated_at: string;
    titles: { slug: string };
  }[];
  const hubs = new Map<string, string>();
  const titles = new Map<string, string>();
  for (const r of rows) {
    hubs.set(`platform/${r.platform}`, r.updated_at);
    hubs.set(`country/${r.country.toLowerCase()}`, r.updated_at);
    hubs.set(`language/${r.language}`, r.updated_at);
    const tKey = `title/${r.titles.slug}`;
    if (!titles.has(tKey) || (titles.get(tKey) as string) < r.updated_at) {
      titles.set(tKey, r.updated_at);
    }
    const cKey = `title/${r.titles.slug}/${r.country.toLowerCase()}`;
    if (!titles.has(cKey) || (titles.get(cKey) as string) < r.updated_at) {
      titles.set(cKey, r.updated_at);
    }
  }
  const hubEntries: MetadataRoute.Sitemap = [...hubs.entries()].map(([path, lastModified]) => ({
    url: `${base}/${path}`,
    lastModified,
    changeFrequency: "daily" as const,
  }));
  const titleEntries: MetadataRoute.Sitemap = [...titles.entries()].map(([path, lastModified]) => ({
    url: `${base}/${path}`,
    lastModified,
    changeFrequency: "weekly" as const,
  }));
  return [...staticEntries, ...hubEntries, ...titleEntries];
}
