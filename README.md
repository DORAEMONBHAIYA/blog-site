# OTT Release Tracker (working name)

Auto-publishing site that tracks streaming/OTT release dates (movies, TV, web series)
across major global platforms, with a dedicated multilingual India wedge
(JioHotstar, SonyLIV, Zee5, Netflix India — Hindi/Tamil/Telugu/Malayalam/Bengali).

Fully automated: no manual page creation, writing, or SEO work after initial build.

## Read these docs in order
1. `REQUIREMENTS.md` — what this must do and the hard constraints (free-tier only, zero manual ops)
2. `ARCHITECTURE.md` — the pipeline and Supabase schema
3. `DATA_SOURCES.md` — TMDB API usage, rate limits, attribution
4. `LLM.md` — content-generation rules and prompt templates
5. `SEO_GEO.md` — SEO + GEO automation requirements
6. `ROADMAP.md` — build order, phase by phase
7. `AGENTS.md` — instructions specifically for the coding agent (OpenCode reads this automatically)

## Stack (all free tier)
- Frontend: Next.js (App Router)
- Hosting: Vercel (primary) — Netlify or Render as fallback
- Database: Supabase (Postgres)
- Scheduler: GitHub Actions (cron) — not Vercel Cron, which is limited on Hobby tier
- LLM: OpenRouter free models, rotated, with Gemini/Groq as fallback
- Domain: free subdomain (`.vercel.app` / `.netlify.app`) at launch

## Quick start (for the agent)
```
npm create next-app@latest .
npm install @supabase/supabase-js
```
Then follow `ROADMAP.md` phase by phase. Do not skip ahead to deployment before
Phase 4 (SEO/GEO layer) is in place — pages published without schema/meta/hreflang
have to be reprocessed later, which wastes LLM free-tier quota.
