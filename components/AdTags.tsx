"use client";

import { useEffect, useId, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Client-side ad tag injection. document-touching snippets must run as
 * real DOM-inserted scripts post-hydration — React-rendered <script>
 * nodes alone do not reliably execute, so we append imperatively here.
 * Renders nothing when its env var is unset (clean disable, SSR-safe:
 * useEffect never runs on the server).
 *
 * Refresh semantics: every injector removes its own nodes first AND on
 * cleanup, so remounting (see RefreshScope) always yields a fresh
 * auction instead of a stale creative.
 */
function useInjectSnippet(id: string, code: string | null, container?: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    if (!code) return;
    document.getElementById(id)?.remove();
    const s = document.createElement("script");
    s.id = id;
    s.text = code;
    (container?.current ?? document.body).appendChild(s);
    return () => {
      document.getElementById(id)?.remove();
    };
  }, [id, code, container]);
}

export function MonetagTags() {
  // Vignette deliberately disabled (user report: too aggressive — it
  // hijacked navigation in testing). Code path kept so it can return
  // via env alone; in-page push stays as the single Monetag format.
  const inpush = process.env.NEXT_PUBLIC_MONETAG_INPAGEPUSH_ZONE;
  useInjectSnippet(
    "monetag-inpagepush",
    inpush
      ? `(function(s){s.dataset.zone='${inpush}',s.src='https://nap5k.com/tag.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))`
      : null,
  );
  return null;
}

/**
 * Forces ad remount (and therefore re-injection) on every client-side
 * route change. next/navigation Link transitions don't reload the page,
 * so without this the initial page's creatives would persist forever.
 * display:contents keeps it layout-neutral.
 */
export function RefreshScope({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <span key={pathname} style={{ display: "contents" }}>
      {children}
    </span>
  );
}

/**
 * Adsterra native unit: an external script that fills a fixed container
 * div (container-{key}). Unlike the iframe pattern there is no atOptions —
 * the script finds its container by id. Because the container id derives
 * from the key, the SAME key can only fill ONE slot per page (duplicate
 * ids race), so callers must render at most one native unit per page.
 */
export function NativeBannerUnit({ scriptSrc }: { scriptSrc: string }) {
  const slotRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;
    const m = scriptSrc.match(/([a-f0-9]{32})/);
    if (!m) return;
    slot.id = `container-${m[1]}`;
    slot.querySelectorAll("script").forEach((n) => n.remove());
    const s = document.createElement("script");
    s.src = scriptSrc;
    s.async = true;
    (s as HTMLScriptElement).dataset.cfasync = "false";
    slot.appendChild(s);
    return () => {
      slot.querySelectorAll("script").forEach((n) => n.remove());
    };
  }, [scriptSrc]);
  return (
    <div
      ref={slotRef}
      style={{ minHeight: 250, maxWidth: "100%" }}
      className="flex items-center justify-center overflow-hidden"
    />
  );
}
/**
 * Generic Adsterra iframe-banner unit (atOptions + invoke.js pattern).
 * One instance per placement; useId keeps element ids unique when several
 * units share a page. NOTE: concurrent units share the global atOptions
 * for a brief window — the standard Adsterra multi-placement pattern;
 * if creatives ever mismatch placements, serialize injection here.
 */
export function AdBannerUnit({
  bannerKey,
  width,
  height,
}: {
  bannerKey: string;
  width: number;
  height: number;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const slotRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;
    slot.querySelectorAll("script").forEach((n) => n.remove());
    const opts = document.createElement("script");
    opts.dataset.unit = uid;
    opts.text = `atOptions = {'key' : '${bannerKey}','format' : 'iframe','height' : ${height},'width' : ${width},'params' : {}};`;
    const invoke = document.createElement("script");
    invoke.dataset.unit = uid;
    invoke.src = `https://www.highrevenueformat.com/${bannerKey}/invoke.js`;
    invoke.async = true;
    slot.appendChild(opts);
    slot.appendChild(invoke);
    return () => {
      slot.querySelectorAll("script").forEach((n) => n.remove());
    };
  }, [uid, bannerKey, width, height]);
  return (
    <div
      ref={slotRef}
      style={{ minHeight: height, maxWidth: "100%" }}
      className="flex items-center justify-center overflow-hidden"
    />
  );
}
