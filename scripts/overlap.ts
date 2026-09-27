/**
 * Text validators for generated content.
 *
 * Bigram-overlap ratio (near-duplicate guard): what fraction of the
 * generated body's word-pairs also appear in the source overview?
 * Bigrams (not unigrams) are the unit because shared single words
 * ("Netflix", "BTS", "film") are required facts, while shared PAIRS
 * ("self-inflicted end", "rural communities") signal copied phrasing —
 * the near-duplicate risk that Google flags even when the underlying
 * facts are correctly licensed.
 *
 * Calibration on pilot samples (reported, not silent):
 * - Black Goat body quoted ~20 overview words verbatim in a 55-word
 *   body  -> ratio ~0.36  -> FLAGGED at the 0.30 default. Correct:
 *   that IS the pattern we must not publish.
 * - Paraphrased bodies (Drishyam hi, Zakir hi, BTS en) share only
 *   title/genre tokens -> ratio < 0.10 -> PASS with wide margin.
 * - Hindi bodies vs English overviews score ~0.0x (only Latin tokens
 *   like "Prime Video" can match) -> the check is weakest exactly
 *   where native-language generation already forces restructuring,
 *   strongest on English bodies where the risk lives.
 * So 0.30 separates "quoted a sentence" from "wrote it fresh" with
 * margin on both sides. Tunable via --max-overlap.
 */

export function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9\u0900-\u097f]+/u)
    .filter((w) => w.length > 0);
}

export function bigrams(words: string[]): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i + 1 < words.length; i++) {
    out.add(`${words[i]} ${words[i + 1]}`);
  }
  return out;
}

/** Fraction of body bigrams also present in the overview (0..1). */
export function overlapRatio(body: string, overview: string): number {
  const bodyBigrams = bigrams(tokens(body));
  if (bodyBigrams.size === 0 || !overview.trim()) return 0;
  const overBigrams = bigrams(tokens(overview));
  let shared = 0;
  for (const b of bodyBigrams) {
    if (overBigrams.has(b)) shared++;
  }
  return shared / bodyBigrams.size;
}

/**
 * Hard floor for overlong fields: cut at the last word boundary
 * within max. No ellipsis (keeps meta clean); callers log when used.
 */
export function truncateAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace <= 0) return cut.trim();
  return cut.slice(0, lastSpace).trim();
}

export interface FaqItem {
  question: string;
  answer: string;
}

/** JSON-artifact patterns from weak models (pilot: qwen embedded serialized JSON). */
const JSON_ARTIFACT = /"\s*:\s*"|[{}\[\]]|\\"/;

export function faqIsClean(faq: unknown): faq is FaqItem[] {
  if (!Array.isArray(faq) || faq.length < 2 || faq.length > 3) return false;
  return faq.every(
    (f) =>
      typeof f === "object" &&
      f !== null &&
      typeof (f as FaqItem).question === "string" &&
      typeof (f as FaqItem).answer === "string" &&
      (f as FaqItem).question.trim().length > 0 &&
      (f as FaqItem).answer.trim().length > 0 &&
      !JSON_ARTIFACT.test((f as FaqItem).question) &&
      !JSON_ARTIFACT.test((f as FaqItem).answer),
  );
}
