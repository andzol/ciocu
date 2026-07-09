// Server-side Lemon Squeezy lookups. LS is our source of truth for who's paying and on which plan
// (no local DB). Fails CLOSED — if the API key is missing or a call errors, we treat the user as
// unpaid/free rather than risk granting a paid resource.

import type { Tier } from "@/lib/usage/rates";

const LS_API = "https://api.lemonsqueezy.com/v1";
const API_KEY = process.env.LEMONSQUEEZY_API_KEY || "";

// Which LS variant maps to which plan. Set these to your product's variant ids; an active
// subscription on an unmapped variant still counts as at least "basic".
const VARIANT_BASIC = process.env.LEMONSQUEEZY_VARIANT_BASIC || "";
const VARIANT_PRO = process.env.LEMONSQUEEZY_VARIANT_PRO || "";

// Statuses that mean "currently entitled". "cancelled" keeps status "active" until the paid
// period actually ends (then it becomes "expired"), so it's covered here.
const ACTIVE_STATUSES = new Set(["active", "on_trial"]);

interface SubRow {
  attributes?: { status?: string; variant_id?: number | string };
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

/** True if the email has any active subscription (gates paid-only features like Soniox). */
export async function hasActiveSubscription(email: string): Promise<boolean> {
  return (await fetchActiveSubscription(email)) !== null;
}

/** The plan tier the email is currently entitled to. */
export async function getSubscriptionTier(email: string): Promise<Tier> {
  const sub = await fetchActiveSubscription(email);
  if (!sub) return "none";
  const variant = String(sub.attributes?.variant_id ?? "");
  if (VARIANT_PRO && variant === VARIANT_PRO) return "pro";
  if (VARIANT_BASIC && variant === VARIANT_BASIC) return "basic";
  return "basic"; // active but unmapped variant → at least basic
}
