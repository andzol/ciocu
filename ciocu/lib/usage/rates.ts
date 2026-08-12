// The usage rate card — the single in-code source of truth for how activity converts to cost.
// Mirrors docs/usage-and-pricing.md; if the doc changes, change here (and vice-versa).
//
// The unit is the "credit": 1 credit = $0.01 of real vendor cost. Everything a user does is
// converted into credits so a heterogeneous cost base (Soniox billed per hour, DeepSeek billed
// per token) collapses into one monthly allowance.

export const CREDIT_USD = 0.01; // 1 credit = one cent of vendor cost

// ── Rate card (credits per unit of activity) ────────────────────────────────────
export const CREDITS_PER_VOICE_MINUTE = 0.5; // Soniox STT @ $0.30/hr  → $0.005/min
export const CREDITS_PER_CHAT_MESSAGE = 0.1; // DeepSeek V4 Pro reply (~2k in + ~300 out)
export const CREDITS_PER_TURN_OVERHEAD = 0.03; // mood read + memory reflect (V4 Flash, background)
// Each active Knowledge base queried on a turn: a LlamaCloud retrieval + the extra chunks injected
// into the reply. Scales with how many bases are enabled.
export const CREDITS_PER_KNOWLEDGE_QUERY = 0.08;
// Embeddings / recall / storage / eye rendering are on-device or idle → 0 credits.

// ── Tiers ────────────────────────────────────────────────────────────────────────
export type Tier = "none" | "starter" | "basic" | "pro";

// Allowances hold a flat 40 credits per dollar across all three paid tiers, so the ladder is
// proportional and nobody is punished for starting small. Derived from the 50%-profit model (§5 of
// docs/usage-and-pricing.md) and rounded down for buffer.
export const TIER_ALLOWANCE: Record<Tier, number> = {
  none: 0, // not subscribed
  starter: 400, // $10 / mo — the "try it properly" tier (~13 hrs voice, or ~3,000 messages)
  basic: 800, // $20 / mo
  pro: 4400, // $95 / mo
};

/** Plan ladder, low → high. Used to pick the best of several active subscriptions, and to decide
 *  which plans are an upgrade from where you are. */
export const TIER_RANK: Record<Tier, number> = { none: 0, starter: 1, basic: 2, pro: 3 };

// One-time "top-up" pack: buy more credits mid-period without changing plan. Sized to one basic
// month (~$20 → 800 credits), so a maxed-out basic user who tops up drops from 100% back to ~50%.
// Top-ups are counted per billing period (from the provider orders) and don't roll over.
export const CREDITS_PER_TOPUP = 800;

// When remaining credits drop to/below this floor, stop spending on (expensive) voice and let the
// cheap text path carry the rest of the month — she throttles, she never goes silent.
export const VOICE_THROTTLE_FLOOR = 10; // credits (~20 min of voice held in reserve)

// Free (unsubscribed) users get a taste, then must subscribe. Counts Ciocu's replies (exchanges)
// and resets with the monthly period. Paid tiers are not message-capped (text is ~free).
export const FREE_MESSAGE_LIMIT = 10;

// ── Converters ──────────────────────────────────────────────────────────────────
/** Credits for a span of *active, streamed* speech-to-text (not wall-clock time). */
export function voiceCredits(seconds: number): number {
  if (!(seconds > 0)) return 0;
  return (seconds / 60) * CREDITS_PER_VOICE_MINUTE;
}

/** Credits for `n` of Ciocu's chat replies. */
export function chatCredits(messages: number): number {
  if (!(messages > 0)) return 0;
  return messages * CREDITS_PER_CHAT_MESSAGE;
}

/** Credits for `n` turns' worth of background overhead (mood + reflect). */
export function turnOverheadCredits(turns: number): number {
  if (!(turns > 0)) return 0;
  return turns * CREDITS_PER_TURN_OVERHEAD;
}

/** Credits for `n` Knowledge-base retrievals (one per active base per turn). */
export function knowledgeCredits(queries: number): number {
  if (!(queries > 0)) return 0;
  return queries * CREDITS_PER_KNOWLEDGE_QUERY;
}
