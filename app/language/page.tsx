import type { Metadata } from "next";
import HubIndex from "@/components/HubIndex";
import { SITE_NAME } from "@/lib/site";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Browse by language",
  description: `Streaming releases by language — including Hindi, Tamil, Telugu, Malayalam and Bengali — tracked by ${SITE_NAME}.`,
};

export default function LanguageIndexPage() {
  return <HubIndex kind="language" title="Browse by language" blurb="Releases by language, with natively-generated regional content." />;
}
