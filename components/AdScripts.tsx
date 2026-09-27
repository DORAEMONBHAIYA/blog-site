import Script from "next/script";

/**
 * Third-party ad tags (Monetag vignette + in-page push, Adsterra social bar).
 * Each renders only when its env var is set — unsetting disables cleanly.
 * next/script with afterInteractive runs post-hydration only, so the
 * document-touching snippets never execute during SSR/prerender.
 */
const VIGNETTE_ZONE = process.env.NEXT_PUBLIC_MONETAG_VIGNETTE_ZONE;
const INPAGEPUSH_ZONE = process.env.NEXT_PUBLIC_MONETAG_INPAGEPUSH_ZONE;
const ADSTERRA_SRC = process.env.NEXT_PUBLIC_ADSTERRA_SOCIALBAR_SRC;

function inlineSnippet(zone: string, src: string): string {
  return `(function(s){s.dataset.zone='${zone}',s.src='${src}'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))`;
}

export default function AdScripts() {
  return (
    <>
      {VIGNETTE_ZONE && (
        <Script
          id="monetag-vignette"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: inlineSnippet(VIGNETTE_ZONE, "https://n6wxm.com/vignette.min.js"),
          }}
        />
      )}
      {INPAGEPUSH_ZONE && (
        <Script
          id="monetag-inpagepush"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: inlineSnippet(INPAGEPUSH_ZONE, "https://nap5k.com/tag.min.js"),
          }}
        />
      )}
      {ADSTERRA_SRC && <Script id="adsterra-socialbar" strategy="afterInteractive" src={ADSTERRA_SRC} />}
    </>
  );
}
