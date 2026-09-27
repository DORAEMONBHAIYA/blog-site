# Data Sources

## TMDB API (primary, only required source)
- Base: `https://api.themoviedb.org/3`
- Free API key, sign up at themoviedb.org — required, apply before Phase 2.
- Key endpoints:
  - `/discover/movie` and `/discover/tv` with `sort_by=primary_release_date.desc` —
    find newly-added/upcoming titles.
  - `/movie/{id}/watch/providers` and `/tv/{id}/watch/providers` — which platform
    has the title, per country (this is the JustWatch-sourced data, used under
    TMDB's license — do NOT scrape JustWatch directly).
  - `/movie/{id}` / `/tv/{id}` — factual metadata (overview, genres, cast) for
    grounding the LLM prompt.
- Rate limit: generous for this volume, but the ingestion script must still batch
  requests and respect TMDB's rate-limit headers.
- **Attribution requirement**: TMDB requires a visible attribution notice
  ("This product uses the TMDB API but is not endorsed or certified by TMDB").
  Put this in the site footer — non-negotiable, part of their free-API terms.

## What NOT to use as a data source
- Do not scrape OtakuKart, What's on Netflix, or any other publisher's articles.
- Do not scrape JustWatch's website directly — use TMDB's licensed watch/providers
  data instead.

## Adding more sources later (not in v1)
If TMDB coverage of India-specific platforms (JioHotstar, SonyLIV, Zee5) turns out
to be thin for some titles, the fallback is each platform's own public press-release
RSS/announcement feed where one exists — never their competitors' write-ups.
