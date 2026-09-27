# Roadmap

Work through these phases in order. One phase = one commit/PR. Do not start a
phase until the previous one is verified working.

## Phase 0 — Setup
- Init Next.js (App Router, TypeScript) repo.
- Create Supabase project, apply schema from `ARCHITECTURE.md`.
- Set up `.env` from `.env.example`.

## Phase 1 — Ingestion script
- Script that calls TMDB `/discover` + `/watch/providers`, writes new rows into
  `titles`/`releases`, skips existing `tmdb_id`s.
- Run manually first to verify data quality before wiring to cron.

## Phase 2 — LLM content generation
- Script that reads unprocessed `releases` rows, builds the grounded prompt
  from `LLM.md`, calls OpenRouter (with fallback), validates JSON output,
  writes to `generated_content`, marks `releases.processed = true`.

## Phase 3 — Page templates
- `/title/[slug]` and `/title/[slug]/[country]` dynamic routes.
- Inject meta tags, JSON-LD, hreflang, canonical per `SEO_GEO.md`.

## Phase 4 — Hub pages + sitemap
- `/platform/[x]`, `/country/[x]`, `/language/[x]` hub pages with internal links.
- `next-sitemap` wired to a live Supabase query.

## Phase 5 — Automation wiring
- GitHub Actions workflow: runs Phase 1 script then Phase 2 script on a schedule.
- Confirm Vercel ISR (or a deploy hook) picks up new Supabase rows without a
  manual redeploy.

## Phase 6 — Deploy
- Deploy to Vercel free tier, connect free subdomain.
- Verify with the `playwright` MCP tool that a live page actually renders the
  expected schema/meta/hreflang — not just that the build succeeds.

## Phase 7 — Verification checklist (manual, one-time)
- Submit sitemap to Google Search Console (the one step that can't be automated).
- Confirm TMDB attribution notice is visible in the footer.
- Spot-check 5-10 generated pages for factual accuracy against TMDB source data.
