import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Canonical Supabase access for the whole repo (per AGENTS.md).
 * All database access goes through `getDb()` — never ad-hoc clients.
 *
 * Server-side only: prefers SUPABASE_SERVICE_ROLE_KEY (scripts, server
 * components, route handlers), falls back to the publishable anon key
 * for read-only contexts. RLS grants public SELECT on all three tables,
 * so the anon key can render pages; writes need the service role key.
 */

export interface Title {
  id: string;
  tmdb_id: number;
  media_type: "movie" | "tv";
  name: string;
  slug: string;
  original_language: string | null;
  genres: string[];
  overview: string | null;
  poster_path: string | null;
  vote_average: number | null;
  created_at: string;
  updated_at: string;
}

export interface Release {
  id: string;
  title_id: string;
  platform: string;
  country: string;
  language: string;
  release_date: string | null;
  processed: boolean;
  created_at: string;
  updated_at: string;
}

export interface GeneratedContent {
  id: string;
  release_id: string;
  meta_title: string | null;
  meta_description: string | null;
  body: string | null;
  faq: { question: string; answer: string }[];
  tags: string[];
  model_used: string | null;
  /** Review flags: thin_body (<30 words), short_faq (avg answer <3 words), truncated, high_overlap (>=0.20). */
  quality_flags: string[];
  body_word_count: number | null;
  overlap_ratio: number | null;
  created_at: string;
  updated_at: string;
}

/** Release + its title + generated content, as rendered by title pages. */
export interface ReleasePageRow extends Release {
  titles: Title;
  generated_content: GeneratedContent | null;
}

let cached: SupabaseClient | undefined;

export function getDb(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing Supabase env: set NEXT_PUBLIC_SUPABASE_URL and " +
        "(SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY). " +
        "See .env.example.",
    );
  }
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}

/** URL-safe slug: lowercase, alnum + hyphens. Caller appends tmdb id. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
