/**
 * Phase 2 — LLM content generation (ROADMAP.md, LLM.md).
 *
 *   npm run generate [-- --limit=20] [--dry-run] [--max-overlap=0.3]
 *                    [--sleep-ms=15000] [--models=id1,id2]
 *
 * Reads unprocessed releases, builds the grounded prompt (facts only,
 * human-readable labels never raw codes, native-language bodies for
 * India variants), rotates OpenRouter :free models, validates, writes
 * generated_content, marks releases.processed = true ON SUCCESS ONLY.
 *
 * Validation ladder per row (pilot-calibrated):
 *   shape (keys/types/faq cleanliness) -> lengths (retry-shorten, then
 *   hard truncate at word boundary) -> bigram overlap vs overview
 *   (aggressive-rephrase retry, then SKIP with processed=false so the
 *   next cron cycle retries with a possibly better model).
 * Partial progress per run is normal; only missing env is fatal.
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { getDb, type GeneratedContent } from "../lib/db";
import { DEFAULT_MAX_OVERLAP, LIMITS, OPENROUTER_MODELS } from "../lib/models";
import { COUNTRY_LABELS, LANGUAGE_LABELS, platformLabel } from "../lib/site";
import { faqIsClean, overlapRatio, tokens, truncateAtWord } from "./overlap";
import { sleep } from "./tmdb";

interface Row {
  id: string;
  platform: string;
  country: string;
  language: string;
  release_date: string | null;
  titles: {
    name: string;
    media_type: string;
    original_language: string | null;
    genres: string[];
    overview: string | null;
  };
}

interface Args {
  dryRun: boolean;
  limit: number;
  maxOverlap: number;
  sleepMs: number;
  models: string[];
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    dryRun: false,
    limit: 20,
    maxOverlap: DEFAULT_MAX_OVERLAP,
    sleepMs: 15000,
    models: OPENROUTER_MODELS.map((m) => m.id),
  };
  for (const a of argv) {
    if (a === "--dry-run") args.dryRun = true;
    else if (a.startsWith("--limit="))
      args.limit = Math.max(1, Number(a.split("=")[1]) || 20);
    else if (a.startsWith("--max-overlap=")) {
      const v = Number(a.split("=")[1]);
      if (v >= 0 && v <= 1) args.maxOverlap = v;
    } else if (a.startsWith("--sleep-ms="))
      args.sleepMs = Math.max(0, Number(a.split("=")[1]) || 15000);
    else if (a.startsWith("--models=")) {
      const list = a.split("=")[1].split(",").map((s) => s.trim()).filter(Boolean);
      if (list.length > 0) args.models = list;
    }
  }
  return args;
}

function labels(r: Row): { platform: string; country: string; language: string } {
  return {
    platform: platformLabel(r.platform),
    country: COUNTRY_LABELS[r.country] ?? r.country,
    language: LANGUAGE_LABELS[r.language] ?? r.language,
  };
}

function buildPrompt(r: Row, strict?: string): string {
  const l = labels(r);
  const native =
    r.language === "en"
      ? "Write everything in English."
      : `Write the body and faq answers in ${l.language} (native script). Keep meta_title/meta_description/tags in English.`;
  const today = new Date().toISOString().slice(0, 10);
  const status =
    r.release_date == null
      ? "Release status: date unannounced — use neutral phrasing (no 'now streaming', no past tense)."
      : r.release_date > today
        ? `Release status: UPCOMING (releases ${r.release_date}) — use future tense ("will release", "set to stream"), never past tense.`
        : `Release status: RELEASED (${r.release_date}) — past/present tense is fine.`;
  return `You are writing a short, factual release-announcement snippet for a streaming release tracker. Use ONLY the facts provided below — do not add plot details, opinions, ratings, cast, or trivia not present here. If a requested detail is not in the facts, omit it rather than inventing it.

IMPORTANT — use your own restructured sentences: do NOT quote the overview and do NOT closely mirror its wording or sentence order. A reader comparing your text with the overview must see different phrasing, not the same sentences lightly rearranged. Mentioning the same required facts (title, platform, date) in plain words is expected and fine.

Country means the AVAILABILITY region only — it says where the title streams, never where it was produced or filmed. Never state a production origin, filming location, or words like "exclusively" unless the overview explicitly says so.

Title: ${r.titles.name}
Type: ${r.titles.media_type === "movie" ? "movie" : "tv"}
Platform: ${l.platform}
Country: ${l.country}
Language: ${l.language}
Release date: ${r.release_date ?? "unannounced"}
${status}
Genres: ${r.titles.genres.join(", ") || "unknown"}
Official overview: ${r.titles.overview || "not provided"}

${native}
${strict ? `\nSTRICT CORRECTION — your previous attempt failed validation: ${strict}. Fix exactly this and return the complete JSON again.` : ""}
Output as JSON with these exact keys:
- meta_title (under 60 chars)
- meta_description (under 155 chars)
- body (2-3 short paragraphs, plain factual tone, mention platform/country/date naturally)
- faq: array of 2-3 {question, answer} pairs a viewer would actually search for (e.g. "When does X release on Y in Z?"), answered only from the facts above
- tags: array of lowercase tags (platform, country, language, genre)`;
}

async function callOpenRouter(
  apiKey: string,
  model: string,
  prompt: string,
): Promise<string> {
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await sleep(20000);
    let res: Response;
    try {
      res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "ott-release-tracker",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.3,
        }),
      });
    } catch {
      continue;
    }
    if (res.status === 429 || res.status >= 500) {
      await sleep(30000);
      continue;
    }
    if (!res.ok) throw new Error(`OpenRouter ${model} -> ${res.status}`);
    const data = (await res.json()) as {
      choices: { message: { content: string } }[];
    };
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error(`OpenRouter ${model} -> empty choice`);
    return text;
  }
  throw new Error(`OpenRouter ${model} -> rate-limited/unavailable`);
}

interface Parsed {
  meta_title: unknown;
  meta_description: unknown;
  body: unknown;
  faq: unknown;
  tags: unknown;
}

type Verdict =
  | { kind: "ok"; content: Omit<GeneratedContent, "id" | "created_at" | "updated_at">; overlap: number; truncated: boolean }
  | ShapeFail
  | { kind: "length" | "overlap" | "parse"; detail: string };

interface ShapeFail {
  kind: "shape";
  detail: string;
}

function checkShape(p: Parsed): ShapeFail | null {
  const missing = ["meta_title", "meta_description", "body", "faq", "tags"].filter(
    (k) => !(k in p),
  );
  if (missing.length > 0)
    return { kind: "shape", detail: `missing keys: ${missing.join(",")}` };
  if (
    typeof p.meta_title !== "string" || !p.meta_title.trim() ||
    typeof p.meta_description !== "string" || !p.meta_description.trim() ||
    typeof p.body !== "string" || !p.body.trim()
  )
    return { kind: "shape", detail: "empty meta_title/meta_description/body" };
  if (!faqIsClean(p.faq)) return { kind: "shape", detail: "faq malformed (need 2-3 clean Q&A)" };
  if (
    !Array.isArray(p.tags) || p.tags.length === 0 ||
    !p.tags.every((t) => typeof t === "string" && t === t.toLowerCase() && t.trim())
  )
    return { kind: "shape", detail: "tags must be non-empty lowercase strings" };
  return null;
}

/** Quality flags: thin_body (<30 words), short_faq (avg answer <3), truncated, high_overlap (>=0.20). */
export function qualityFlags(
  body: string,
  faq: { question: string; answer: string }[],
  overlap: number,
  truncated: boolean,
): string[] {
  const flags: string[] = [];
  if (tokens(body).length < 30) flags.push("thin_body");
  const avgAns = faq.reduce((n, f) => n + tokens(f.answer).length, 0) / Math.max(1, faq.length);
  if (avgAns < 3) flags.push("short_faq");
  if (truncated) flags.push("truncated");
  if (overlap >= 0.2) flags.push("high_overlap");
  return flags;
}

async function generateRow(
  apiKey: string,
  models: string[],
  r: Row,
  maxOverlap: number,
  log: (m: string) => void,
): Promise<{ verdict: Verdict; modelUsed: string }> {
  let modelIdx = 0;
  async function nextText(prompt: string): Promise<{ text: string; model: string } | null> {
    while (modelIdx < models.length) {
      const m = models[modelIdx++];
      try {
        return { text: await callOpenRouter(apiKey, m, prompt), model: m };
      } catch (e) {
        log(`  ${m}: ${e instanceof Error ? e.message.slice(0, 100) : e}`);
      }
    }
    return null;
  }

  // Attempt 1: base prompt. At most 3 generations per row total
  // (initial + strict retries) — then skip and let a later cron cycle retry.
  let generations = 0;
  let current: { text: string; model: string } | null = null;
  let strictNote: string | undefined;

  for (let g = 0; g < 3; g++) {
    const prompt = strictNote ? buildPrompt(r, strictNote) : buildPrompt(r);
    current = await nextText(prompt);
    if (!current) break;
    generations++;
    let parsed: Parsed;
    try {
      parsed = JSON.parse(current.text) as Parsed;
    } catch {
      strictNote = "your previous output was not valid JSON. Return ONLY a JSON object.";
      continue;
    }
    const shapeFail = checkShape(parsed);
    if (shapeFail) {
      strictNote = `your previous output failed shape validation (${shapeFail.detail}). Return the complete JSON with all five clean keys.`;
      continue;
    }
    // Lengths: strict shorten retry once, then the hard floor.
    let title = parsed.meta_title as string;
    let desc = parsed.meta_description as string;
    let truncated = false;
    if (title.length > LIMITS.metaTitle || desc.length > LIMITS.metaDescription) {
      if (g < 2) {
        strictNote =
          `your meta_title was ${title.length} chars (max ${LIMITS.metaTitle}) and ` +
          `meta_description was ${desc.length} chars (max ${LIMITS.metaDescription}). ` +
          `Rewrite both shorter and return the complete JSON again.`;
        continue;
      }
    }
    if (title.length > LIMITS.metaTitle || desc.length > LIMITS.metaDescription) {
      title = truncateAtWord(title, LIMITS.metaTitle);
      desc = truncateAtWord(desc, LIMITS.metaDescription);
      truncated = true;
    }
    // Near-duplicate guard vs the source overview.
    const overlap = overlapRatio(parsed.body as string, r.titles.overview ?? "");
    if (overlap >= maxOverlap) {
      if (g < 2) {
        strictNote =
          `your body shares too much phrasing with the source overview (overlap ${overlap.toFixed(2)}, ` +
          `must be under ${maxOverlap}). Rewrite with substantially different sentence structures and ` +
          `word choices, keeping every fact identical, and return the complete JSON again.`;
        continue;
      }
      return {
        verdict: { kind: "overlap", detail: `ratio ${overlap.toFixed(2)} > ${maxOverlap} after rephrase retry` },
        modelUsed: current.model,
      };
    }
    return {
      verdict: {
        kind: "ok",
        content: {
          release_id: r.id,
          meta_title: title,
          meta_description: desc,
          body: parsed.body as string,
          faq: parsed.faq as { question: string; answer: string }[],
          tags: parsed.tags as string[],
          model_used: current.model,
          body_word_count: tokens(parsed.body as string).length,
          overlap_ratio: overlap,
          quality_flags: qualityFlags(
            parsed.body as string,
            parsed.faq as { question: string; answer: string }[],
            overlap,
            truncated,
          ),
        },
        overlap,
        truncated,
      },
      modelUsed: current.model,
    };
  }

  if (!current) {
    return { verdict: { kind: "parse", detail: "all models unavailable" }, modelUsed: "" };
  }
  return {
    verdict: { kind: "shape", detail: `failed validation after ${generations} attempts (last: ${strictNote ?? "?"})` },
    modelUsed: current.model,
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error("FATAL: OPENROUTER_API_KEY is not set (see .env.example).");
    process.exit(2);
  }
  console.log(
    `generate: limit=${args.limit} maxOverlap=${args.maxOverlap} models=${args.models.length}` +
      (args.dryRun ? " DRY-RUN" : ""),
  );

  const db = args.dryRun ? null : getDb();
  const { data, error } = await (args.dryRun ? getDb() : db!)
    .from("releases")
    .select("id, platform, country, language, release_date, titles!inner(name, media_type, original_language, genres, overview)")
    .eq("processed", false)
    .order("created_at", { ascending: true })
    .limit(args.limit);
  if (error || !data) throw new Error(`db read: ${error?.message}`);
  const rows = data as unknown as Row[];
  console.log(`generate: ${rows.length} unprocessed releases`);

  let done = 0;
  let skipped = 0;
  let truncatedCount = 0;
  const skipReasons: Record<string, number> = {};
  const reviewList: string[] = [];

  for (const r of rows) {
    console.log(`- ${r.titles.name} [${r.language}] ${r.platform}/${r.country}`);
    const { verdict, modelUsed } = await generateRow(apiKey, args.models, r, args.maxOverlap, (m) => console.log(m));
    if (verdict.kind !== "ok") {
      skipped++;
      skipReasons[verdict.kind] = (skipReasons[verdict.kind] ?? 0) + 1;
      console.log(`  SKIP (${verdict.kind}): ${verdict.detail} — stays processed=false`);
    } else {
      if (verdict.truncated) {
        truncatedCount++;
        console.log(`  note: length floor applied (hard-truncated at word boundary)`);
      }
      console.log(`  OK via ${modelUsed} overlap=${verdict.overlap.toFixed(2)}`);
      if (verdict.content.quality_flags.length > 0) {
        const entry = `${r.titles.name} [${r.language}] ${r.platform}/${r.country}: ${verdict.content.quality_flags.join(",")}`;
        reviewList.push(entry);
        console.log(`  FLAGGED for manual review: ${entry}`);
      }
      if (!args.dryRun) {
        const { error: wErr } = await db!
          .from("generated_content")
          .upsert({ ...verdict.content, release_id: r.id, model_used: modelUsed }, { onConflict: "release_id" });
        if (wErr) {
          console.log(`  WRITE FAILED: ${wErr.message} — stays processed=false`);
          skipped++;
          skipReasons["write"] = (skipReasons["write"] ?? 0) + 1;
        } else {
          const { error: pErr } = await db!.from("releases").update({ processed: true }).eq("id", r.id);
          if (pErr) console.log(`  WARN: content written but processed flag failed: ${pErr.message}`);
          else done++;
        }
      } else {
        done++;
      }
    }
    await sleep(args.sleepMs);
  }

  console.log(
    `generate done: ok=${done} skipped=${skipped} truncated=${truncatedCount} ` +
      `reasons=${JSON.stringify(skipReasons)}`,
  );
  if (reviewList.length > 0) {
    console.log(`REVIEW (${reviewList.length} rows worth a manual look):`);
    for (const entry of reviewList) console.log(`  - ${entry}`);
  }
}

main().catch((e) => {
  console.error("FATAL:", e instanceof Error ? e.message : e);
  process.exit(1);
});
