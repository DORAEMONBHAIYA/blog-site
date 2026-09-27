/**
 * Minimal TMDB v3 client for the ingestion pipeline.
 * Auth: free API key via `api_key` query param (see DATA_SOURCES.md).
 * Only flatrate (streaming) availability is used — never buy/rent.
 */

export const TMDB_BASE = "https://api.themoviedb.org/3";

export type MediaType = "movie" | "tv";

export interface DiscoverMovie {
  id: number;
  title: string;
  original_language: string;
  genre_ids: number[];
  overview: string;
  poster_path: string | null;
  release_date: string;
  vote_average: number;
}

export interface DiscoverTv {
  id: number;
  name: string;
  original_language: string;
  genre_ids: number[];
  overview: string;
  poster_path: string | null;
  first_air_date: string;
  vote_average: number;
}

export interface ProviderEntry {
  provider_id: number;
  provider_name: string;
  display_priority: number;
}

export interface CountryProviders {
  link?: string;
  flatrate?: ProviderEntry[];
  rent?: ProviderEntry[];
  buy?: ProviderEntry[];
}

export interface ProvidersResponse {
  id: number;
  results: Record<string, CountryProviders>;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * GET with retries: 429 (respects Retry-After), 5xx, and transient network
 * errors (ECONNRESET etc. — observed ~1-in-6 flakiness to TMDB from some
 * networks) get up to MAX_ATTEMPTS with exponential backoff. 4xx throws
 * immediately (bad key / bad params won't fix themselves).
 */
export async function tmdbGet<T>(
  path: string,
  params: Record<string, string | number | undefined>,
  apiKey: string,
  maxAttempts = 4,
): Promise<T> {
  const url = new URL(TMDB_BASE + path);
  url.searchParams.set("api_key", apiKey);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) await sleep(Math.min(1000 * 2 ** (attempt - 1), 15000));
    let res: Response;
    try {
      res = await fetch(url.toString(), {
        headers: { accept: "application/json" },
      });
    } catch (e) {
      lastErr = e;
      continue; // transient network error — back off and retry
    }
    if (res.status === 429) {
      const waitMs =
        Number(res.headers.get("retry-after") || "5") * 1000 || 5000;
      await sleep(Math.min(waitMs, 30000));
      lastErr = new Error(`TMDB ${path} -> 429 rate limited`);
      continue;
    }
    if (res.status >= 500) {
      lastErr = new Error(`TMDB ${path} -> ${res.status} ${res.statusText}`);
      continue;
    }
    if (!res.ok) {
      throw new Error(`TMDB ${path} -> ${res.status} ${res.statusText}`);
    }
    return (await res.json()) as T;
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error(`TMDB ${path} -> failed after ${maxAttempts} attempts`);
}

/** Normalize a TMDB provider_name to a lookup key. */
export function normalizeProviderName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * TMDB provider_name (normalized) -> our platform key.
 * Keys must exist in PLATFORM_LABELS (lib/site.ts).
 * JioCinema merged into JioHotstar, so it maps there too.
 * Unmapped providers return null and are skipped (logged).
 */
const PROVIDER_MAP: Record<string, string> = {
  netflix: "netflix",
  netflixstandardwithads: "netflix",
  netflixbasicwithads: "netflix",
  amazonprimevideo: "prime",
  amazonprimevideowithads: "prime",
  primevideo: "prime",
  disneyplus: "disney",
  disneyplushotstar: "jiohotstar",
  hotstar: "jiohotstar",
  jiohotstar: "jiohotstar",
  jiocinema: "jiohotstar",
  sonyliv: "sonyliv",
  zee5: "zee5",
  max: "max",
  hbomax: "max",
  hulu: "hulu",
  appletvplus: "appletv",
  paramountplus: "paramount",
  peacock: "peacock",
  peacockpremium: "peacock",
};

export function mapProvider(name: string): string | null {
  return PROVIDER_MAP[normalizeProviderName(name)] ?? null;
}

/** Target countries for the v1 pipeline. */
export const TARGET_COUNTRIES = ["IN", "US", "GB", "CA", "AU"];

/** India regional languages that get their own natively-generated variant. */
export const INDIA_LANGUAGES = ["hi", "ta", "te", "ml", "bn"];

/**
 * Languages to create release rows for. India gets English plus the
 * title's own language when it's a covered regional language (LLM.md:
 * bodies are generated natively per language); elsewhere English only.
 */
export function languagesFor(
  country: string,
  originalLanguage: string,
): string[] {
  if (country === "IN" && INDIA_LANGUAGES.includes(originalLanguage)) {
    return ["en", originalLanguage];
  }
  return ["en"];
}

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
