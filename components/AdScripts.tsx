import Script from "next/script";
import { MonetagTags } from "./AdTags";

/**
 * Third-party ad tags. Plain external files load via next/script
 * (afterInteractive = post-hydration only, never at build/SSR).
 * Document-touching inline snippets run through <MonetagTags>, which
 * appends them imperatively — React-rendered <script> nodes alone do
 * not reliably execute. Each tag renders only when its env var is set.
 */
const ADSTERRA_SRC = process.env.NEXT_PUBLIC_ADSTERRA_SOCIALBAR_SRC;

export default function AdScripts() {
  return (
    <>
      <MonetagTags />
      {ADSTERRA_SRC && <Script id="adsterra-socialbar" strategy="afterInteractive" src={ADSTERRA_SRC} />}
    </>
  );
}
