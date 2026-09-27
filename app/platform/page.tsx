import type { Metadata } from "next";
import HubIndex from "@/components/HubIndex";
import { SITE_NAME } from "@/lib/site";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Browse by platform",
  description: `All streaming platforms tracked by ${SITE_NAME} — Netflix, Prime Video, JioHotstar, SonyLIV, Zee5 and more.`,
};

export default function PlatformIndexPage() {
  return <HubIndex kind="platform" title="Browse by platform" blurb="Every platform tracked automatically, with its latest releases." />;
}
