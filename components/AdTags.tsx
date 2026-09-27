"use client";

import { useEffect, useRef } from "react";
import AdSlot from "./AdSlot";

/**
 * Client-side ad tag injection. document-touching snippets must run as
 * real DOM-inserted scripts post-hydration — React-rendered <script>
 * nodes alone do not reliably execute, so we append imperatively here.
 * Renders nothing when its env var is unset (clean disable, SSR-safe:
 * useEffect never runs on the server).
 */
function useInjectSnippet(id: string, code: string | null, container?: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    if (!code) return;
    if (document.getElementById(id)) return; // StrictMode / re-run guard
    const s = document.createElement("script");
    s.id = id;
    s.text = code;
    (container?.current ?? document.body).appendChild(s);
  }, [id, code, container]);
}

export function MonetagTags() {
  const vignette = process.env.NEXT_PUBLIC_MONETAG_VIGNETTE_ZONE;
  const inpush = process.env.NEXT_PUBLIC_MONETAG_INPAGEPUSH_ZONE;
  useInjectSnippet(
    "monetag-vignette",
    vignette
      ? `(function(s){s.dataset.zone='${vignette}',s.src='https://n6wxm.com/vignette.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))`
      : null,
  );
  useInjectSnippet(
    "monetag-inpagepush",
    inpush
      ? `(function(s){s.dataset.zone='${inpush}',s.src='https://nap5k.com/tag.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))`
      : null,
  );
  return null;
}

export function AdsterraBanner() {
  const key = process.env.NEXT_PUBLIC_ADSTERRA_BANNER_KEY;
  const slotRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!key) return;
    if (document.getElementById("adsterra-banner-options")) return;
    const opts = document.createElement("script");
    opts.id = "adsterra-banner-options";
    opts.text = `atOptions = {'key' : '${key}','format' : 'iframe','height' : 90,'width' : 728,'params' : {}};`;
    const invoke = document.createElement("script");
    invoke.id = "adsterra-banner-invoke";
    invoke.src = `https://www.highrevenueformat.com/${key}/invoke.js`;
    invoke.async = true;
    const slot = slotRef.current ?? document.body;
    slot.appendChild(opts);
    slot.appendChild(invoke);
  }, [key]);
  if (!key) return <AdSlot slot="header" className="h-[90px]" />;
  return <div ref={slotRef} className="flex min-h-[90px] items-center justify-center" />;
}
