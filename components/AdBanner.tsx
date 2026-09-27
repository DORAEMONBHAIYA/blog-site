import AdSlot from "./AdSlot";
import { AdBannerUnit, NativeBannerUnit, RefreshScope } from "./AdTags";

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
  // NEXT_PUBLIC_ADSTERRA_NATIVE_KEY holds the full native script src; the
  // container id derives from the key inside it. One slot per page only —
  // callers insert after the 3rd card; duplicate container ids would race.
  const src = process.env.NEXT_PUBLIC_ADSTERRA_NATIVE_KEY;
  if (!src) return null;
  return (
    <li aria-hidden="true" className="list-none">
      <RefreshScope>
        <NativeBannerUnit scriptSrc={src} />
      </RefreshScope>
    </li>
  );
}
