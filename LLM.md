# LLM Content Generation

## Providers (free tier, rotate to spread rate limits)
1. OpenRouter — use `:free` suffixed models (e.g. Llama, Gemma, Mistral variants).
   Availability of specific free models shifts over time; the ingestion script
   should read the model list from config, not hardcode one model.
2. Fallback: direct Gemini API free tier, or Groq free tier, if OpenRouter's free
   models are rate-limited or unavailable for a given run.

## Grounding rule (non-negotiable)
The prompt must only be given fields already in the `titles`/`releases` DB rows
(name, type, genres, overview, platform, country, language, release_date). The
model must not be asked to invent or guess plot details, ratings, or trivia not
present in that data. If asked for something ungrounded, it should omit it rather
than fabricate.

## Prompt template (draft)

```
You are writing a short, factual release-announcement snippet for a streaming
release tracker. Use ONLY the facts provided below — do not add plot details,
opinions, or trivia not present here.

Title: {name}
Type: {movie|tv}
Platform: {platform}
Country: {country}
Language: {language}
Release date: {release_date}
Genres: {genres}
Official overview: {overview}

Output as JSON with these exact keys:
- meta_title (under 60 chars)
- meta_description (under 155 chars)
- body (2-3 short paragraphs, plain factual tone, mention platform/country/date
  naturally)
- faq: array of 2-3 {question, answer} pairs a viewer would actually search for
  (e.g. "When does X release on Y in Z?"), answered only from the facts above
- tags: array of lowercase tags (platform, country, language, genre)
```

## Output validation
Before writing to `generated_content`, the ingestion script should verify the
response is valid JSON with all required keys — if not, retry once with a stricter
instruction, then skip and log the row rather than publishing malformed content.

## Multilingual note
For India-language variants, generate the `body` and `faq` directly in the target
language (Hindi/Tamil/Telugu/etc.) rather than generating English and translating —
this produces more natural, better-ranking regional-language content and reuses the
same grounded-prompt approach.
