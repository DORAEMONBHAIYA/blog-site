/**
 * Site-wide constants: platform display names (global + India wedge),
 * country/language labels, TMDB attribution (required by TMDB free-API
 * terms — must stay visible in the footer, see DATA_SOURCES.md).
 */

export const SITE_NAME = "OTT Release Tracker";

export const TMDB_ATTRIBUTION =
  "This product uses the TMDB API but is not endorsed or certified by TMDB.";

/** Watch-provider keys as returned by TMDB /watch/providers `provider_name` slugged. */
export const PLATFORM_LABELS: Record<string, string> = {
  netflix: "Netflix",
  amazon: "Prime Video",
  prime: "Prime Video",
  disney: "Disney+",
  hotstar: "JioHotstar",
  jiohotstar: "JioHotstar",
  sonyliv: "SonyLIV",
  zee5: "Zee5",
  max: "Max",
  hulu: "Hulu",
  appletv: "Apple TV+",
  paramount: "Paramount+",
  peacock: "Peacock",
};

export function platformLabel(key: string): string {
  return (
    PLATFORM_LABELS[key.toLowerCase()] ??
    key.charAt(0).toUpperCase() + key.slice(1)
  );
}

export const COUNTRY_LABELS: Record<string, string> = {
  IN: "India",
  US: "United States",
  GB: "United Kingdom",
  CA: "Canada",
  AU: "Australia",
};

export const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  ta: "Tamil",
  te: "Telugu",
  ml: "Malayalam",
  bn: "Bengali",
};

export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}
