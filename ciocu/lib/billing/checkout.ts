"use client";

// Opens the provider's hosted checkout in a new tab. Provider-neutral; the current provider is
// Rendben (USDC / Solana). There are three distinct products now — Basic, Pro, and a one-time
// top-up — each its own checkout URL, so "Get Basic" / "Get Pro" go straight to the right plan.
//
// The signed-in email is appended as ?email= so the checkout records the SAME email the server
// verifies against (see lib/billing/provider.ts — verification is by customer_email). Rendben must
// read ?email= to prefill; until it does, the buyer types it and it has to match their Google email.
//
// No overlay SDK (the previous provider's overlay script is gone). Checkout opens in a new tab; when the user returns, the
// focus listener in page.tsx re-reads the subscription, so a fresh purchase is reflected.

export const CHECKOUT_STARTER_URL = process.env.NEXT_PUBLIC_CHECKOUT_STARTER_URL ?? "";
export const CHECKOUT_BASIC_URL = process.env.NEXT_PUBLIC_CHECKOUT_BASIC_URL ?? "";
export const CHECKOUT_PRO_URL = process.env.NEXT_PUBLIC_CHECKOUT_PRO_URL ?? "";
export const TOPUP_URL = process.env.NEXT_PUBLIC_CHECKOUT_TOPUP_URL ?? "";

/** Which paid tiers actually have a checkout configured — a plan with no URL isn't offered. */
export const CHECKOUT_URLS: Record<string, string> = {
  starter: CHECKOUT_STARTER_URL,
  basic: CHECKOUT_BASIC_URL,
  pro: CHECKOUT_PRO_URL,
};

/** True once at least one plan checkout is configured — gates the whole billing UI. */
export const CHECKOUT_ENABLED = Object.values(CHECKOUT_URLS).some(Boolean);

/** Fired after a return from checkout so listeners (page.tsx) re-read the tier. */
export const SUB_UPDATED_EVENT = "ciocu:sub-updated";

function withEmail(base: string, email: string): string {
  if (!base) return "";
  try {
    const u = new URL(base);
    if (email) u.searchParams.set("email", email);
    return u.toString();
  } catch {
    return base; // malformed URL — open it as-is rather than swallow the click
  }
}

function openCheckoutTab(base: string, email: string): void {
  const url = withEmail(base, email);
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

/** Open the checkout for a specific plan, prefilled with `email`. */
export function openCheckout(tier: "starter" | "basic" | "pro", email: string): void {
  openCheckoutTab(CHECKOUT_URLS[tier] ?? "", email);
}

/** Open the one-time top-up checkout, prefilled with `email`. */
export function openTopup(email: string): void {
  openCheckoutTab(TOPUP_URL, email);
}
