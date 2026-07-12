"use client";

// Opening Lemon Squeezy checkout as an on-site OVERLAY (via lemon.js) instead of a new tab, so the
// user never leaves ciocu.app and there's nothing to "redirect back" from. On a successful
// purchase we fire `ciocu:sub-updated`, which the app listens for to refresh the plan/tier.
// LS is a Merchant of Record (handles EU VAT + holds the customer list).

export const CHECKOUT_URL = process.env.NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL ?? "";
// One-time "credit top-up" product's checkout URL. Buying it adds a pack of credits to the current
// period (counted server-side from LS orders — see lib/billing/lemonsqueezy.ts).
export const TOPUP_URL = process.env.NEXT_PUBLIC_LEMONSQUEEZY_TOPUP_URL ?? "";
const LS_JS = "https://assets.lemonsqueezy.com/lemon.js";

interface LemonSqueezyApi {
  Setup: (opts: { eventHandler: (e: { event: string }) => void }) => void;
  Url: { Open: (url: string) => void };
}
declare global {
  interface Window {
    LemonSqueezy?: LemonSqueezyApi;
    createLemonSqueezy?: () => void;
  }
}

/** Fired on Checkout.Success so listeners (page.tsx) can re-read the tier. */
export const SUB_UPDATED_EVENT = "ciocu:sub-updated";

let ready: Promise<boolean> | null = null;

function load(): Promise<boolean> {
  if (ready) return ready;
  ready = new Promise<boolean>((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    const finish = () => {
      try {
        window.createLemonSqueezy?.();
        window.LemonSqueezy?.Setup({
          eventHandler: (e) => {
            if (e.event === "Checkout.Success") {
              window.dispatchEvent(new Event(SUB_UPDATED_EVENT));
            }
          },
        });
        resolve(!!window.LemonSqueezy);
      } catch {
        resolve(false);
      }
    };
    if (window.LemonSqueezy) {
      finish();
      return;
    }
    let script = document.querySelector<HTMLScriptElement>(`script[src="${LS_JS}"]`);
    if (!script) {
      script = document.createElement("script");
      script.src = LS_JS;
      script.defer = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", finish);
    script.addEventListener("error", () => resolve(false));
  });
  return ready;
}

function buildUrl(base: string, email: string, overlay: boolean): string {
  const sep = base.includes("?") ? "&" : "?";
  const embed = overlay ? "embed=1&" : "";
  return `${base}${sep}${embed}checkout[email]=${encodeURIComponent(email)}`;
}

/** Open a LS checkout `base` prefilled with `email`. Overlay if lemon.js loads; new-tab fallback. */
function openLemon(base: string, email: string): void {
  if (!base) return;
  void load().then((ok) => {
    if (ok && window.LemonSqueezy?.Url?.Open) {
      window.LemonSqueezy.Url.Open(buildUrl(base, email, true));
    } else {
      window.open(buildUrl(base, email, false), "_blank", "noopener,noreferrer");
    }
  });
}

/** Open plan checkout (subscribe / upgrade) prefilled with `email`. */
export function openCheckout(email: string): void {
  openLemon(CHECKOUT_URL, email);
}

/** Open the one-time credit top-up checkout prefilled with `email`. */
export function openTopup(email: string): void {
  openLemon(TOPUP_URL, email);
}
