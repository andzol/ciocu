"use client";

// The plan cards shown in Settings. Prices come from /api/plans (i.e. from Lemon Squeezy) — only
// the names and feature lists live here, because those describe what the code gates, not what the
// customer is charged.

import { FREE_MESSAGE_LIMIT, TIER_ALLOWANCE, type Tier } from "@/lib/usage/rates";

export interface PlanPrice {
  tier: Exclude<Tier, "none">;
  priceCents: number | null;
  interval: string | null;
}

export interface PlanCard {
  tier: Tier;
  name: string;
  tagline: string;
  features: string[];
}

const energy = (t: Exclude<Tier, "none">) => `${TIER_ALLOWANCE[t].toLocaleString()} energy a month`;

// Pro is 5.5× Basic, and rounding that to "6×" would advertise more than the plan gives. Keep the
// half, drop a trailing ".0" — never round a claim in our own favour.
const proMultiple = (() => {
  const x = TIER_ALLOWANCE.pro / TIER_ALLOWANCE.basic;
  return Number.isInteger(x) ? String(x) : x.toFixed(1);
})();

// Each line is a real gate in the code, not a promise:
//  - free messages   → FREE_MESSAGE_LIMIT, enforced in lib/usage/ledger.ts
//  - Soniox voice    → /api/stt-token refuses without an active subscription
//  - Knowledge bases → the Settings section renders only for tier !== "none"
//  - sync            → /api/memory is session + subscription gated
// If a gate moves, move the line with it.
export const PLAN_CARDS: PlanCard[] = [
  {
    tier: "none",
    name: "Free",
    tagline: "Meet Ciocu",
    features: [
      `${FREE_MESSAGE_LIMIT} messages a month`,
      "She sees you and reacts",
      "Memory stays on this device",
    ],
  },
  {
    tier: "basic",
    name: "Basic",
    tagline: "Talk to her properly",
    features: [
      "Everything in Free, and:",
      "Real-time voice",
      "She remembers you across sessions",
      "Memory synced across your devices",
      "Knowledge bases",
      energy("basic"),
    ],
  },
  {
    tier: "pro",
    name: "Pro",
    tagline: "For talking every day",
    features: [
      "Everything in Basic, and:",
      `${energy("pro")} — ${proMultiple}× Basic`,
      "Room for daily voice",
      "Top-ups when you need them",
    ],
  },
];

/** Live prices, keyed by tier. Empty on failure — the card then says so rather than inventing one. */
export async function loadPlanPrices(): Promise<Record<string, PlanPrice>> {
  try {
    const res = await fetch("/api/plans");
    if (!res.ok) return {};
    const data = await res.json();
    const list: PlanPrice[] = Array.isArray(data?.plans) ? data.plans : [];
    return Object.fromEntries(list.map((p) => [p.tier, p]));
  } catch {
    return {};
  }
}

/**
 * "$19.99" / "$95" — trailing ".00" dropped, because a whole-dollar price reads as a price, not an
 * accounting entry. Cents are kept when they exist, since $19.99 is not $20 to a customer.
 */
export function formatPrice(cents: number): string {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}
