/**
 * LLM provider/model configuration (LLM.md).
 * Read from config, never hardcoded in scripts: scripts import
 * OPENROUTER_MODELS in order and rotate on 429/failure.
 * Direct Gemini/Groq REST fallback plugs into the same rotation
 * via `completeWithFallback` (follow-up; OpenRouter's :free rotation
 * already spans 7 models and proved sufficient in the pilot).
 */

export interface ModelRef {
  id: string;
  provider: "openrouter";
  /** Pilot-tested working order: first entry answered while others 429'd. */
  note?: string;
}

export const OPENROUTER_MODELS: ModelRef[] = [
  { id: "nvidia/nemotron-3-super-120b-a12b:free", provider: "openrouter", note: "pilot: answered when 6 others 429'd" },
  { id: "google/gemma-4-31b-it:free", provider: "openrouter" },
  { id: "google/gemma-4-26b-a4b-it:free", provider: "openrouter" },
  { id: "nvidia/nemotron-3.5-lightning:free", provider: "openrouter" },
  { id: "poolside/laguna-s-2.1:free", provider: "openrouter" },
  { id: "dots-studio/dots-3-note-preview:free", provider: "openrouter" },
  { id: "qwen/qwen3.8-27b:free", provider: "openrouter", note: "pilot: weak instruction-following, last resort" },
];

/** Field limits enforced by validators (SEO_GEO.md / LLM.md). */
export const LIMITS = {
  metaTitle: 60,
  metaDescription: 155,
  faqMin: 2,
  faqMax: 3,
} as const;

/**
 * Default bigram-overlap ceiling between generated body and source
 * overview (0.30 — calibrated on pilot samples, see scripts/overlap.ts).
 * Tunable per-run via --max-overlap.
 */
export const DEFAULT_MAX_OVERLAP = 0.3;
