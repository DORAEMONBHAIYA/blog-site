import AdSlot from "./AdSlot";
import { AdBannerUnit, RefreshScope } from "./AdTags";

/**
 * Server wrappers: read env (build/request time), render placeholder
 * fallbacks when unset, otherwise a pathname-keyed live unit that
 * refreshes on client-side navigation (see RefreshScope).
 */

export default function AdBanner() {
  const key = process.env.NEXT_PUBLIC_ADSTERRA_BANNER_KEY;
  if (!key) return <AdSlot slot="header" className="h-[90px]" />;
  return (
    <RefreshScope>
      <AdBannerUnit bannerKey={key} width={728} height={90} />
    </RefreshScope>
  );
}

export function FooterBanner() {
  const key = process.env.NEXT_PUBLIC_ADSTERRA_FOOTER_BANNER_KEY;
  if (!key) return <AdSlot slot="footer" className="h-[90px]" />;
  return (
    <RefreshScope>
      <AdBannerUnit bannerKey={key} width={728} height={90} />
    </RefreshScope>
  );
}

export function InFeedBanner() {
  const key = process.env.NEXT_PUBLIC_ADSTERRA_NATIVE_KEY;
  if (!key) return null;
  return (
    <li aria-hidden="true" className="list-none">
      <RefreshScope>
        <AdBannerUnit bannerKey={key} width={300} height={250} />
      </RefreshScope>
    </li>
  );
}
