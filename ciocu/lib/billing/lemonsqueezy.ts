// Server-side Lemon Squeezy lookups. LS is our source of truth for who's paying, on which plan, and
// how many one-time top-up packs they've bought this billing period (no local DB). Fails CLOSED —
// if the API key is missing or a call errors, we treat the user as unpaid/free with no top-ups
// rather than risk granting a paid resource.

import { CREDITS_PER_TOPUP, type Tier } from "@/lib/usage/rates";

const LS_API = "https://api.lemonsqueezy.com/v1";
const API_KEY = process.env.LEMONSQUEEZY_API_KEY || "";

// Which LS variant maps to which plan. Set these to your product's variant ids; an active
// subscription on an unmapped variant still counts as at least "basic".
const VARIANT_BASIC = process.env.LEMONSQUEEZY_VARIANT_BASIC || "";
const VARIANT_PRO = process.env.LEMONSQUEEZY_VARIANT_PRO || "";
// The one-time "credit top-up" product's variant id. Each paid order of this variant, placed within
// the current billing period, adds CREDITS_PER_TOPUP to the user's allowance for that period.
const VARIANT_TOPUP = process.env.LEMONSQUEEZY_VARIANT_TOPUP || "";

// Statuses that mean "currently entitled". "cancelled" keeps status "active" until the paid
// period actually ends (then it becomes "expired"), so it's covered here.
const ACTIVE_STATUSES = new Set(["active", "on_trial"]);

interface SubRow {
  attributes?: { status?: string; variant_id?: number | string; renews_at?: string | null };
}

interface OrderRow {
  attributes?: {
    status?: string;
    created_at?: string;
    first_order_item?: { variant_id?: number | string };
  };
}

/** The plan + billing info the client needs to size and reset the usage meter. */
export interface SubscriptionInfo {
  tier: Tier;
  renewsAt: number | null; // epoch ms of the next renewal (period end), or null if not subscribed
  topupCredits: number; // extra credits from top-up packs bought this period (0 if none)
}

/** The user's currently-active subscription row, or null. */
async function fetchActiveSubscription(email: string): Promise<SubRow | null> {
  if (!API_KEY || !email) return null;
  try {
    const res = await fetch(
      `${LS_API}/subscriptions?filter[user_email]=${encodeURIComponent(email)}`,
      { headers: { Authorization: `Bearer ${API_KEY}`, Accept: "application/vnd.api+json" }, cache: "no-store" },
    );
    if (!res.ok) return null;
    const body = await res.json();
    const rows: SubRow[] = body?.data ?? [];
    return rows.find((r) => ACTIVE_STATUSES.has(r.attributes?.status ?? "")) ?? null;
  } catch {
    return null;
  }
}

function tierOf(sub: SubRow): Tier {
  const variant = String(sub.attributes?.variant_id ?? "");
  if (VARIANT_PRO && variant === VARIANT_PRO) return "pro";
  if (VARIANT_BASIC && variant === VARIANT_BASIC) return "basic";
  return "basic"; // active but unmapped variant → at least basic
}

// The current billing period runs [renewsAt − 1 month, renewsAt). We count top-up orders placed at
// or after this start so packs expire with the month (they don't roll over).
function periodStart(renewsAt: number): number {
  const d = new Date(renewsAt);
  d.setMonth(d.getMonth() - 1);
  return d.getTime();
}

/** Total top-up credits from paid top-up orders placed since `sinceMs`. */
async function topupCreditsSince(email: string, sinceMs: number): Promise<number> {
  if (!API_KEY || !email || !VARIANT_TOPUP) return 0;
  try {
    const res = await fetch(
      `${LS_API}/orders?filter[user_email]=${encodeURIComponent(email)}`,
      { headers: { Authorization: `Bearer ${API_KEY}`, Accept: "application/vnd.api+json" }, cache: "no-store" },
    );
    if (!res.ok) return 0;
    const body = await res.json();
    const rows: OrderRow[] = body?.data ?? [];
    let packs = 0;
    for (const r of rows) {
      const a = r.attributes;
      if (!a || a.status !== "paid") continue;
      if (String(a.first_order_item?.variant_id ?? "") !== VARIANT_TOPUP) continue;
      const placed = a.created_at ? Date.parse(a.created_at) : NaN;
      if (Number.isFinite(placed) && placed >= sinceMs) packs += 1;
    }
    return packs * CREDITS_PER_TOPUP;
  } catch {
    return 0;
  }
}

/** True if the email has any active subscription (gates paid-only features like Soniox). */
export async function hasActiveSubscription(email: string): Promise<boolean> {
  return (await fetchActiveSubscription(email)) !== null;
}

/** The plan tier the email is currently entitled to. */
export async function getSubscriptionTier(email: string): Promise<Tier> {
  const sub = await fetchActiveSubscription(email);
  return sub ? tierOf(sub) : "none";
}

/** Tier + renewal date + this period's top-up credits, in one round of LS lookups. */
export async function getSubscriptionInfo(email: string): Promise<SubscriptionInfo> {
  const sub = await fetchActiveSubscription(email);
  if (!sub) return { tier: "none", renewsAt: null, topupCredits: 0 };
  const renewsRaw = sub.attributes?.renews_at ? Date.parse(sub.attributes.renews_at) : NaN;
  const renewsAt = Number.isFinite(renewsRaw) ? renewsRaw : null;
  // Count top-ups since the period began; if we can't tell the period, count the last ~31 days.
  const since = renewsAt ? periodStart(renewsAt) : Date.now() - 31 * 864e5;
  const topupCredits = await topupCreditsSince(email, since);
  return { tier: tierOf(sub), renewsAt, topupCredits };
}
