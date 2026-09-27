import { AdsterraBanner } from "./AdTags";

/**
 * Adsterra 728x90 banner for the header slot. Real creative renders only
 * when NEXT_PUBLIC_ADSTERRA_BANNER_KEY is set, else the placeholder keeps
 * the layout stable. See AdTags.tsx for why injection is imperative.
 */
export default function AdBanner() {
  return <AdsterraBanner />;
}
