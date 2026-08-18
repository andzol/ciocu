// Server-side billing lookups — provider-neutral. The current provider is Rendben (USDC / Solana
// payments), but nothing outside this file names it: the four API routes import these functions, not
// a brand. Rendben is our source of truth for who's paying, on which plan, and how many one-time
// top-ups they've bought this period — no local DB. Fails CLOSED: a missing key or a failed call
// treats the user as unpaid/free with no top-ups rather than risk granting a paid resource.
//
// Verification is by customer_email, so the checkout MUST record the same email Ciocu knows the user
// by (their Google sign-in). lib/billing/checkout.ts appends ?email= to the checkout URL for that.

import { CREDITS_PER_TOPUP, TIER_RANK, type Tier } from "@/lib/usage/rates";

const API = "https://rendben.com/api/v1";
const API_KEY = process.env.BILLING_API_KEY || "";

// The product ids come from the public checkout URLs (the last path segment) — one source of truth,
// no extra env vars, and these ids are public anyway (they're in the URLs a buyer visits). The three
// URLs map a Rendben product to a plan tier / the top-up.
function productIdFromUrl(url: string | undefined): string {
  if (!url) return "";
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || "";
  } catch {
    return "";
  }
}
const PRODUCT_BASIC = productIdFromUrl(process.env.NEXT_PUBLIC_CHECKOUT_BASIC_URL);
const PRODUCT_STANDARD = productIdFromUrl(process.env.NEXT_PUBLIC_CHECKOUT_STANDARD_URL);
const PRODUCT_PRO = productIdFromUrl(process.env.NEXT_PUBLIC_CHECKOUT_PRO_URL);
const PRODUCT_TOPUP = productIdFromUrl(process.env.NEXT_PUBLIC_CHECKOUT_TOPUP_URL);

// Statuses that mean "currently entitled". Rendben reports "active"; `entitled: true` is its own
// belt-and-braces flag on a row, so we honour either.
const ACTIVE_STATUSES = new Set(["active", "trialing", "on_trial"]);

interface RendbenSubscription {
  id?: string;
  productId?: string;
  status?: string;
  entitled?: boolean;
  currentPeriodEnd?: string | null;
  nextChargeAt?: string | null;
}

interface RendbenOrder {
  id?: string;
  productId?: string;
  status?: string;
  confirmedAt?: string | null;
}

interface RendbenProduct {
  id?: string;
  priceUsdc?: string;
  billingInterval?: { unit?: string; count?: number } | null;
}

/** Tier + renewal date + this period's top-up credits — the shape the usage ledger needs. */
export interface SubscriptionInfo {
  tier: Tier;
  renewsAt: number | null; // epoch ms of the next renewal (period end), or null if not subscribed
  topupCredits: number; // extra credits from top-up packs bought this period (0 if none)
}

/** What a paid plan costs, live from the provider. `priceCents` is null when we couldn't tell. */
export interface PlanPrice {
  tier: Exclude<Tier, "none">;
  priceCents: number | null;
  interval: string | null; // "month" | "year" — the provider's billing interval
}

function headers() {
  return { Authorization: `Bearer ${API_KEY}`, Accept: "application/json" };
}

// GET /subscriptions?customer_email — deliberately UNfiltered. Rendben's product_id filter works,
// but we want every plan in one call so activeSubscription() can pick the highest tier; filtering
// would mean one request per plan and would hide exactly the overlap we need to see.
async function fetchSubscriptions(email: string): Promise<RendbenSubscription[]> {
  if (!API_KEY || !email) return [];
  try {
    const res = await fetch(`${API}/subscriptions?customer_email=${encodeURIComponent(email)}`, {
      headers: headers(),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const body = await res.json();
    return Array.isArray(body?.subscriptions) ? body.subscriptions : [];
  } catch {
    return [];
  }
}

function isEntitled(s: RendbenSubscription): boolean {
  return ACTIVE_STATUSES.has(String(s.status ?? "")) || s.entitled === true;
}

/**
 * The BEST currently-entitled subscription, or null.
 *
 * Highest tier wins, not first-found: each plan is a separate Rendben product, and Rendben has no
 * plan-switch, so upgrading leaves the old subscription active alongside the new one. Taking
 * whichever row came back first would then quietly serve a Pro customer their old Basic
 * allowance. Never charge for more than you grant.
 */
function activeSubscription(subs: RendbenSubscription[]): RendbenSubscription | null {
  let best: RendbenSubscription | null = null;
  let bestRank = 0;
  for (const s of subs) {
    if (!isEntitled(s)) continue;
    const rank = TIER_RANK[tierOf(s)] ?? 0;
    if (rank > bestRank || best === null) {
      best = s;
      bestRank = rank;
    }
  }
  return best;
}

function tierOf(sub: RendbenSubscription): Tier {
  const pid = String(sub.productId ?? "");
  if (PRODUCT_PRO && pid === PRODUCT_PRO) return "pro";
  if (PRODUCT_STANDARD && pid === PRODUCT_STANDARD) return "standard";
  if (PRODUCT_BASIC && pid === PRODUCT_BASIC) return "basic";
  return "basic"; // entitled but on an unmapped product → grant the smallest paid tier
}

// The current period runs [renewsAt − 1 month, renewsAt). Top-ups placed at/after this start count
// for this period only — they don't roll over.
function periodStart(renewsAt: number): number {
  const d = new Date(renewsAt);
  d.setMonth(d.getMonth() - 1);
  return d.getTime();
}

/**
 * Total top-up credits from paid top-up orders placed since `sinceMs`.
 *
 * Filtered to the top-up product server-side: a page holds 50 rows, so asking for *all* paid orders
 * and sifting client-side meant a customer with a long purchase history could push their recent
 * top-ups off page one and silently lose credits they'd paid for. Narrowing to one product makes
 * overflow implausible (50 top-ups inside a single billing period). Still keeps the client-side
 * product/status checks — a filter is a request, not a guarantee.
 */
async function topupCreditsSince(email: string, sinceMs: number): Promise<number> {
  if (!API_KEY || !email || !PRODUCT_TOPUP) return 0;
  try {
    const res = await fetch(
      `${API}/orders?customer_email=${encodeURIComponent(email)}` +
        `&product_id=${encodeURIComponent(PRODUCT_TOPUP)}&status=paid`,
      { headers: headers(), cache: "no-store" },
    );
    if (!res.ok) return 0;
    const body = await res.json();
    const orders: RendbenOrder[] = Array.isArray(body?.orders) ? body.orders : [];
    let packs = 0;
    for (const o of orders) {
      if (String(o.status ?? "") !== "paid") continue;
      if (String(o.productId ?? "") !== PRODUCT_TOPUP) continue;
      const placed = o.confirmedAt ? Date.parse(o.confirmedAt) : NaN;
      if (Number.isFinite(placed) && placed >= sinceMs) packs += 1;
    }
    return packs * CREDITS_PER_TOPUP;
  } catch {
    return 0;
  }
}

/** True if the email has any active subscription (gates paid-only features like Soniox). */
export async function hasActiveSubscription(email: string): Promise<boolean> {
  return activeSubscription(await fetchSubscriptions(email)) !== null;
}

// Entitlement, cached briefly. /api/chat needs this on EVERY message to decide whether to consult
// the knowledge index; a provider round-trip per message would add latency to every reply and burn
// rate limit re-answering a question whose answer changes about once a month. A minute is long
// enough to cover a conversation, short enough that a fresh subscription is honoured almost at once.
const ENTITLED_TTL = 60_000;
const entitledCache = new Map<string, { at: number; ok: boolean }>();

/** hasActiveSubscription with a short per-instance cache — for per-request hot paths. */
export async function isEntitledCached(email: string): Promise<boolean> {
  const hit = entitledCache.get(email);
  if (hit && Date.now() - hit.at < ENTITLED_TTL) return hit.ok;
  const ok = await hasActiveSubscription(email);
  if (entitledCache.size > 500) entitledCache.clear(); // bound it; entries are cheap to rebuild
  entitledCache.set(email, { at: Date.now(), ok });
  return ok;
}

/** The plan tier the email is currently entitled to. */
export async function getSubscriptionTier(email: string): Promise<Tier> {
  const sub = activeSubscription(await fetchSubscriptions(email));
  return sub ? tierOf(sub) : "none";
}

/** Tier + renewal date + this period's top-up credits, in one round of provider lookups. */
export async function getSubscriptionInfo(email: string): Promise<SubscriptionInfo> {
  const sub = activeSubscription(await fetchSubscriptions(email));
  if (!sub) return { tier: "none", renewsAt: null, topupCredits: 0 };
  const raw = sub.currentPeriodEnd
    ? Date.parse(sub.currentPeriodEnd)
    : sub.nextChargeAt
      ? Date.parse(sub.nextChargeAt)
      : NaN;
  const renewsAt = Number.isFinite(raw) ? raw : null;
  const since = renewsAt ? periodStart(renewsAt) : Date.now() - 31 * 864e5;
  const topupCredits = await topupCreditsSince(email, since);
  return { tier: tierOf(sub), renewsAt, topupCredits };
}

// Prices live in the Rendben dashboard, not in a deploy, so we read them rather than hold a copy: a
// hard-coded price becomes a false quote the moment someone edits the dashboard. Cached briefly.
let priceCache: { at: number; plans: PlanPrice[] } | null = null;
const PRICE_TTL = 600_000; // 10 min

async function fetchProducts(): Promise<RendbenProduct[]> {
  if (!API_KEY) return [];
  try {
    const res = await fetch(`${API}/products`, { headers: headers(), cache: "no-store" });
    if (!res.ok) return [];
    const body = await res.json();
    return Array.isArray(body?.products) ? body.products : [];
  } catch {
    return [];
  }
}

/**
 * The live price of each paid plan. `priceCents: null` rather than a guess when Rendben is
 * unreachable or a product isn't mapped — the UI then says so instead of quoting a number we can't
 * stand behind. Prices are USDC (dollar-pegged), converted to cents to keep the display contract.
 */
export async function getPlanPrices(): Promise<PlanPrice[]> {
  if (priceCache && Date.now() - priceCache.at < PRICE_TTL) return priceCache.plans;
  const products = await fetchProducts();
  const priceFor = (pid: string): { cents: number | null; interval: string | null } => {
    const p = products.find((x) => String(x.id ?? "") === pid);
    if (!p) return { cents: null, interval: null };
    const usdc = Number(p.priceUsdc);
    return {
      cents: Number.isFinite(usdc) ? Math.round(usdc * 100) : null,
      interval: p.billingInterval?.unit ?? null,
    };
  };
  const basic = priceFor(PRODUCT_BASIC);
  const standard = priceFor(PRODUCT_STANDARD);
  const pro = priceFor(PRODUCT_PRO);
  const plans: PlanPrice[] = [
    { tier: "basic", priceCents: basic.cents, interval: basic.interval },
    { tier: "standard", priceCents: standard.cents, interval: standard.interval },
    { tier: "pro", priceCents: pro.cents, interval: pro.interval },
  ];
  // Don't cache a total failure — that would keep the panel priceless for the whole TTL after a blip.
  if (plans.some((p) => p.priceCents !== null)) priceCache = { at: Date.now(), plans };
  return plans;
}
