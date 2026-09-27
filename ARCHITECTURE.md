# Architecture

## Pipeline (high level)

```
GitHub Actions (cron, every few hours)
  -> fetch new/updated releases from TMDB API (+ watch/providers per country)
  -> diff against Supabase `releases` table (skip already-processed rows)
  -> for each new row: call LLM (OpenRouter, rotated models) with grounded prompt
  -> write generated content + tags into Supabase
  -> trigger Vercel deploy hook (or rely on ISR revalidation)
  -> Next.js renders dynamic route per release, per country/language variant
  -> sitemap.xml, JSON-LD, hreflang, meta tags generated from the same DB row
```

## Supabase schema (draft — agent should refine during Phase 2)

```sql
create table titles (
  id uuid primary key default gen_random_uuid(),
  tmdb_id integer unique not null,
  name text not null,
  type text check (type in ('movie', 'tv')) not null,
  original_language text,
  created_at timestamptz default now()
);

create table releases (
  id uuid primary key default gen_random_uuid(),
  title_id uuid references titles(id),
  platform text not null,        -- e.g. 'netflix', 'jiohotstar', 'sonyliv'
  country text not null,         -- ISO country code
  language text,                 -- for India-language variants
  release_date date,
  processed boolean default false,
  created_at timestamptz default now()
);

create table generated_content (
  id uuid primary key default gen_random_uuid(),
  release_id uuid references releases(id) unique,
  meta_title text,
  meta_description text,
  body text,
  faq jsonb,          -- array of {question, answer}
  tags text[],
  model_used text,    -- which LLM generated this, for debugging/rotation tracking
  created_at timestamptz default now()
);
```

## Routing (Next.js App Router)

- `/title/[slug]` — canonical global page for a title
- `/title/[slug]/[country]` — country/language variant, with hreflang pointing back
  to the canonical and to sibling variants
- `/platform/[platform]` — hub page, auto-lists releases for that platform
- `/country/[country]` — hub page
- `/language/[language]` — hub page (India-language wedge)

## Why GitHub Actions instead of Vercel Cron
Vercel Hobby (free) tier limits cron to once/day. GitHub Actions scheduled workflows
are free and support much shorter intervals, and naturally throttle LLM calls across
the day instead of firing everything in one burst.
