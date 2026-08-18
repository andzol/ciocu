"use client";

// Shared Google sign-in, in two flows:
//   requestToken()  — OAuth access token via a popup. Needs a user gesture, so: the sign-in button.
//   silentReauth()  — One Tap ID token via an iframe. No gesture, no UI, so it can run on load.
//
// This used to live inside GoogleAuth.tsx with only the popup flow, which made an expired server
// session unrecoverable without an explicit sign-out/sign-in — nothing else in the app could reach
// Google, and the popup flow can't run unprompted anyway. Both live here now so the subscription
// sync can recover a lapsed session by itself.
//
// Google's token flow takes ONE callback at init, so requests are serialised: a request in flight
// owns `pending`, and the callback (or error_callback) resolves it.

import { setProfile } from "@/lib/auth/session";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const GIS_SRC = "https://accounts.google.com/gsi/client";

interface TokenResponse {
  access_token?: string;
}
export interface TokenClient {
  requestAccessToken: (overrides?: { prompt?: string }) => void;
}
interface CredentialResponse {
  credential?: string;
}
interface GoogleId {
  initialize(config: {
    client_id: string;
    callback: (res: CredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    use_fedcm_for_prompt?: boolean;
  }): void;
  prompt(): void;
}
interface GoogleOAuth2 {
  initTokenClient(config: {
    client_id: string;
    scope: string;
    callback: (res: TokenResponse) => void;
    error_callback?: (err: unknown) => void;
  }): TokenClient;
}
declare global {
  interface Window {
    google?: { accounts: { oauth2: GoogleOAuth2; id: GoogleId } };
  }
}

let clientPromise: Promise<TokenClient | null> | null = null;
let pending: ((token: string | null) => void) | null = null;

function settle(token: string | null) {
  const p = pending;
  pending = null;
  p?.(token);
}

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve();
    let script = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);
    if (!script) {
      script = document.createElement("script");
      script.src = GIS_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("gis failed")), { once: true });
  });
}

/** The initialised token client, or null if Google is unconfigured/unreachable. Cached. */
export function ensureTokenClient(): Promise<TokenClient | null> {
  if (!CLIENT_ID || typeof window === "undefined") return Promise.resolve(null);
  if (clientPromise) return clientPromise;
  clientPromise = loadScript()
    .then(() => {
      const oauth2 = window.google?.accounts?.oauth2;
      if (!oauth2) return null;
      return oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: "openid email profile",
        callback: (res) => settle(res.access_token ?? null),
        // Fires when the popup is blocked or the user dismisses it — without this a failed attempt
        // would leave `pending` unresolved and every later request queued behind it forever.
        error_callback: () => settle(null),
      });
    })
    .catch(() => null);
  return clientPromise;
}

/**
 * Ask Google for an access token. This opens a popup, so it must come from a user gesture — the
 * sign-in button. Silent recovery uses One Tap instead (see silentReauth).
 */
export function requestToken(): Promise<string | null> {
  return ensureTokenClient().then((client) => {
    if (!client) return null;
    if (pending) return null; // one at a time; a second caller would steal the first's callback
    return new Promise<string | null>((resolve) => {
      pending = resolve;
      try {
        client.requestAccessToken();
      } catch {
        settle(null);
      }
    });
  });
}

/** Display claims out of a One Tap JWT. Decoded, NOT verified — the server verifies the token
 *  itself before granting anything; this only fills in a name and an avatar. */
function claimsOf(jwt: string): { sub?: string; name?: string; email?: string; picture?: string } | null {
  try {
    return JSON.parse(atob(jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

/**
 * Turn proof of identity into a live session: store the profile for the UI and open the signed
 * server cookie. Awaits /api/auth so callers can safely re-query entitlement straight afterwards.
 */
export async function completeSignIn(proof: string | { credential: string }): Promise<boolean> {
  const body =
    typeof proof === "string" ? { access_token: proof } : { credential: proof.credential };

  // Profile is for display only — best-effort, and never a reason to fail the sign-in.
  if (typeof proof === "string") {
    void fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${proof}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((pr) => {
        if (pr?.email) {
          setProfile({ sub: pr.sub, name: pr.name, email: pr.email, picture: pr.picture });
        }
      })
      .catch(() => {});
  } else {
    const c = claimsOf(proof.credential);
    if (c?.email) {
      setProfile({ sub: c.sub, name: c.name ?? c.email, email: c.email, picture: c.picture ?? "" });
    }
  }

  try {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// One Tap resolves in an iframe, so with auto_select it re-establishes identity with no UI at all.
// Deliberately NOT the OAuth token client: that flow always opens a popup, and a popup with no user
// gesture behind it is blocked — confirmed in the browser, where prompt:"none" still logged "Failed
// to open popup window". A blocked popup is not silent auth.
//
// It can still legitimately come back empty (no Google session, multiple accounts, One Tap cooling
// off after dismissals, FedCM off). That is why it resolves false rather than throwing — the caller
// then tells the user their session expired instead of guessing at a plan.
const SILENT_TIMEOUT_MS = 5000;
let oneTapPending: ((credential: string | null) => void) | null = null;
let oneTapReady = false;

function initOneTap(): boolean {
  const id = window.google?.accounts?.id;
  if (!id) return false;
  if (oneTapReady) return true;
  id.initialize({
    client_id: CLIENT_ID,
    callback: (res) => {
      const cb = oneTapPending;
      oneTapPending = null;
      cb?.(res.credential ?? null);
    },
    auto_select: true, // returning user with one account → no prompt at all
    cancel_on_tap_outside: false,
    use_fedcm_for_prompt: true,
  });
  oneTapReady = true;
  return true;
}

/** Re-open a lapsed server session with no UI. True if a fresh session cookie is now set. */
export async function silentReauth(): Promise<boolean> {
  if (!CLIENT_ID || typeof window === "undefined") return false;
  // ensureTokenClient also loads the GIS script, which google.accounts.id needs.
  await ensureTokenClient();
  if (oneTapPending || !initOneTap()) return false;

  const credential = await new Promise<string | null>((resolve) => {
    // One Tap simply never calls back when it decides not to show, so bound the wait — otherwise a
    // silent decline would hold the meter in limbo for the whole session.
    const timer = setTimeout(() => {
      if (oneTapPending === settleOneTap) return settleOneTap(null);
    }, SILENT_TIMEOUT_MS);
    function settleOneTap(v: string | null) {
      clearTimeout(timer);
      oneTapPending = null;
      resolve(v);
    }
    oneTapPending = settleOneTap;
    try {
      window.google!.accounts.id.prompt();
    } catch {
      settleOneTap(null);
    }
  });

  if (!credential) return false;
  return completeSignIn({ credential });
}
