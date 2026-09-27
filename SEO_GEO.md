# SEO & GEO Automation

Every field here must be generated from the DB row automatically — no manual
per-page SEO work.

## On-page SEO (every page)
- `<title>` from `generated_content.meta_title`
- `<meta name="description">` from `generated_content.meta_description`
- Canonical tag pointing to the primary (global) variant of a title
- `hreflang` tags linking all country/language variants of the same title to
  each other, plus `x-default` pointing at the global page
- JSON-LD `Movie` or `TVSeries` schema, built from `titles`/`releases` fields
- JSON-LD `FAQPage` schema from `generated_content.faq`
- JSON-LD `BreadcrumbList` (Home > Platform/Country hub > Title)

## Sitemap
- Regenerate `sitemap.xml` on every build (via `next-sitemap` or equivalent),
  driven by a live query of published pages, not a static list.
- Split into sub-sitemaps by type (titles, platform hubs, country hubs) once the
  page count grows past a few thousand.

## Internal linking (hub pages)
- `/platform/[platform]`, `/country/[country]`, `/language/[language]` hub pages
  auto-list and link to relevant title pages — this is what actually builds
  crawlable structure at scale, not individual pages alone.
- Each title page links to its platform hub, country hub, and 2-3 related titles
  (same platform + release window).

## GEO (generative/AI-engine visibility)
- Structure the FAQ block as literal `<h3>question</h3><p>answer</p>` pairs, not
  buried in prose — this is the format AI Overviews/ChatGPT/Perplexity lift from.
- Show a clear "Last updated" date per page (from `releases.created_at` or an
  update timestamp) — freshness is a signal both search and AI engines weight.
- Add a genuine `/about` page explaining the site is TMDB-data-driven — entity/
  trust signals matter for whether AI engines cite you as a source.
- Keep pages server-rendered (see ARCHITECTURE.md) — AI crawlers that don't
  execute JS need this as much as Google does.

## Explicitly avoid
- Do not stuff keywords into body text beyond what reads naturally.
- Do not create near-duplicate pages for trivially different queries — the
  country/language variant must have genuinely different generated body text
  (per LLM.md), not the same paragraph with a country name swapped in.
