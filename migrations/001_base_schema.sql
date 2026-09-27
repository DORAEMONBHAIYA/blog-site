-- 001: OTT Release Tracker base schema (Phase 0).
-- Refined from ARCHITECTURE.md: slug, genres/overview/poster/vote for LLM
-- grounding + SEO, variant uniqueness, hub/sitemap indexes, public-read RLS.
-- Applied via MCP in two attempts: the first reported success while the DB
-- was still restoring and persisted nothing (caught by read-back); the
-- re-apply on the healthy DB is what stuck.

create table titles (
  id uuid primary key default gen_random_uuid(),
  tmdb_id integer unique not null,
  media_type text check (media_type in ('movie', 'tv')) not null,
  name text not null,
  slug text unique not null,
  original_language text,
  genres text[] not null default '{}',
  overview text,
  poster_path text,
  vote_average double precision,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table releases (
  id uuid primary key default gen_random_uuid(),
  title_id uuid references titles(id) on delete cascade not null,
  platform text not null,
  country text not null,
  language text not null default 'en',
  release_date date,
  processed boolean default false not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (title_id, platform, country, language)
);

create table generated_content (
  id uuid primary key default gen_random_uuid(),
  release_id uuid references releases(id) on delete cascade unique not null,
  meta_title text,
  meta_description text,
  body text,
  faq jsonb not null default '[]',
  tags text[] not null default '{}',
  model_used text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index releases_platform_idx on releases (platform);
create index releases_country_idx on releases (country);
create index releases_language_idx on releases (language);
create index releases_release_date_idx on releases (release_date desc);
create index releases_unprocessed_idx on releases (processed) where processed = false;
create index titles_slug_idx on titles (slug);

alter table titles enable row level security;
alter table releases enable row level security;
alter table generated_content enable row level security;

create policy "public read titles" on titles for select using (true);
create policy "public read releases" on releases for select using (true);
create policy "public read generated_content" on generated_content for select using (true);
