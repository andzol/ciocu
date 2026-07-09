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
// Embeddings / recall / storage / eye rendering are on-device or idle → 0 credits.

// ── Tiers ────────────────────────────────────────────────────────────────────────
// Allowances derived from the 50%-profit model (see the doc §5), rounded down for a buffer.
export type Tier = "none" | "basic" | "pro";

export const TIER_ALLOWANCE: Record<Tier, number> = {
  none: 0, // not subscribed
  basic: 800, // $19.99 / mo
  pro: 4400, // $99.99 / mo
};

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
