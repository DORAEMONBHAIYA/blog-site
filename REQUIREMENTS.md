# Requirements

## Goal
A side-income content site that requires no ongoing manual work after launch:
no writing, no manual publishing, no manual SEO tagging.

## Functional requirements
- Auto-discover new/upcoming streaming releases (movies, TV, web series) via TMDB API.
- Cover global platforms (Netflix, Prime, Disney+, Max, etc.) AND India-specific
  platforms (JioHotstar, SonyLIV, Zee5) with regional-language variants.
- For each new release, auto-generate: a unique short article, meta title/description,
  tags (platform, country, language, genre), FAQ block, and JSON-LD schema.
- Auto-generate hub/category pages (by platform, by country, by language) that
  aggregate and internally link individual release pages.
- Auto-generate and update `sitemap.xml` on every new page.
- Run entirely on a schedule (GitHub Actions), with no human trigger required.

## Non-functional requirements
- **Free tier only** — hosting, database, LLM, domain. No recurring cost at launch.
- **No manual content review step** in the default pipeline — the LLM output goes
  straight to publish. (Optional: log generated content for occasional spot-checking,
  but this must not block publishing.)
- Pages must be server-rendered (not client-only), so search and AI crawlers can
  read them.
- Must tolerate LLM free-tier rate limits without failing the whole run — partial
  progress each cron cycle is acceptable; a full retry is not required.
- Must not scrape or reproduce competitor site content, for legal and SEO-survival
  reasons (see `AGENTS.md`).

## Explicit non-goals (for now)
- No user accounts, comments, or interactivity.
- No manual editorial calendar — the release schedule from TMDB *is* the calendar.
- No paid ad network integration yet — that's a separate later step once traffic
  exists; this repo just needs ad-slot placeholders in the layout.

## Success criteria (6-month horizon)
- Site fully automated and running unattended for 30+ consecutive days without
  a broken pipeline run.
- Indexed page count growing weekly (verified via Search Console, added manually
  once — the one non-automatable step).
- No manual-action or duplicate-content penalty in Search Console.
