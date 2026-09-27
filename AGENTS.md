# Agent Instructions

OpenCode reads this file automatically at the start of every session in this repo.
Read `README.md`, `REQUIREMENTS.md`, and `ARCHITECTURE.md` before writing any code.

## Hard rules

- **Never fetch or reproduce full articles from other sites** (OtakuKart, What's on
  Netflix, etc.). All content must be generated from raw structured data (TMDB API
  fields) via the LLM step, never copied or lightly reworded from a competitor's page.
  This is a legal and SEO-survival requirement, not a style preference.
- **Free tier only.** No paid API tiers, no paid hosting tier, no paid database tier.
  If a task can't be done on a free tier, flag it instead of silently using a paid one.
- **No manual content step.** Every page must be generated end-to-end by the pipeline
  (ingestion → LLM → DB → render). Do not create one-off hand-written pages.
- **Ground every generated fact in the DB row.** The LLM prompt must never ask the
  model to invent plot details, ratings, or cast info not present in the TMDB payload.
- **Every page must ship with:** meta title/description, JSON-LD schema, canonical tag,
  hreflang tags (for country/language variants), and at least one FAQ Q&A block.
  A page missing any of these is incomplete, not "good enough for now."

## Conventions

- TypeScript strict mode.
- Next.js App Router, server components by default.
- Database access only through the Supabase client in `/lib/db`, never ad hoc.
- Commit in small phases matching `ROADMAP.md` — one phase, one commit/PR, so a
  broken phase can be reverted without losing earlier work.
- Before marking a phase done, self-check it against the relevant requirement in
  `REQUIREMENTS.md` — don't just check that the code runs.
- Schema changes live in `/migrations`, one purpose per file (DDL and data
  backfills are separate files — the runner has silently skipped trailing
  statements before). After every migration, read back via a direct query
  (tables, constraints, or row counts) — a "success" response is not proof.

## Available MCP tools (see `opencode.jsonc`)

- `context7` — use for any library/API you're not 100% current on (Next.js App Router,
  Supabase client, TMDB API) instead of relying on training data.
- `supabase` — use for schema creation/migrations and query testing directly, instead
  of writing raw SQL blind.
- `github` — use for repo/PR operations.
- `playwright` — use to verify rendered pages actually contain the expected schema
  markup, meta tags, and hreflang — don't assume the template output is correct.
