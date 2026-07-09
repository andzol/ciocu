"use client";

// Opening the Lemon Squeezy hosted checkout, shared by the menu's Subscribe item and the
// Settings panel's upgrade button. LS is a Merchant of Record (handles EU VAT + holds the
// customer list); we just append the signed-in email so checkout is prefilled.

export const CHECKOUT_URL = process.env.NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL ?? "";

/** Open checkout prefilled with `email`. Returns false if no checkout URL is configured. */
export function openCheckout(email: string): boolean {
  if (!CHECKOUT_URL) return false;
  const sep = CHECKOUT_URL.includes("?") ? "&" : "?";
  const url = `${CHECKOUT_URL}${sep}checkout[email]=${encodeURIComponent(email)}`;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}
