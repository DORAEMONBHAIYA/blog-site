import type { Metadata } from "next";
import HubIndex from "@/components/HubIndex";
import { SITE_NAME } from "@/lib/site";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Browse by country",
  description: `Streaming release dates by country, tracked automatically by ${SITE_NAME}.`,
};

export default function CountryIndexPage() {
  return <HubIndex kind="country" title="Browse by country" blurb="Release dates per country, from global coverage to the India wedge." />;
}
