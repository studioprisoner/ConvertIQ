/**
 * Central registry of Anthropic model IDs (CON-116).
 *
 * Kept in one place so a model upgrade is a single edit instead of ~10 scattered
 * string literals across providers, routes, and cost trackers. Each is
 * env-overridable so a new model can be rolled without a code change.
 *
 * History: the previous pin, `claude-3-5-sonnet-20241022`, was retired by
 * Anthropic on 2025-10-28 and began returning 404s in production — every analysis
 * silently degraded to fallbacks (CON-118). `claude-sonnet-4-6` is the documented
 * drop-in replacement.
 */
export const AI_MODELS = {
  /** Primary analysis model — conversion / UX / SEO / comprehensive. */
  analysis: process.env.ANTHROPIC_ANALYSIS_MODEL ?? 'claude-sonnet-4-6',
  /** Fast, low-cost model for lightweight tasks (health checks, monitoring). */
  fast: process.env.ANTHROPIC_FAST_MODEL ?? 'claude-haiku-4-5',
} as const;

export type AiModelTier = keyof typeof AI_MODELS;
