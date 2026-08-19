"use client";

// Tiny shared store for the signed-in Google user, so both the topbar chip and the menu's
// Subscribe action read one source of truth. Persisted to localStorage (survives reloads,
// syncs across tabs). The profile stored here has already been verified server-side by
// /api/auth — we only persist trusted profiles.

import { useSyncExternalStore } from "react";

export interface GoogleProfile {
  sub?: string;
  name: string;
  email: string;
  picture: string;
}

const KEY = "ciocu.google.profile";

/**
 * Dispatched once the signed httpOnly session cookie is actually in place — NOT when the profile
 * appears. The two are separate: the profile is set from Google's userinfo while /api/auth is still
 * in flight, so anything that calls a session-gated endpoint on "user became truthy" can easily beat
 * its own cookie and get a 401.
 */
export const SESSION_OPENED_EVENT = "ciocu:session-opened";
const listeners = new Set<() => void>();
let current: GoogleProfile | null = null;

/**
 * Undo UTF-8-read-as-Latin-1 ("Zoltán" → "ZoltÃ¡n").
 *
 * A shipped build stored names decoded that way, and a stored profile is only ever rewritten at the
 * next sign-in — which, with a healthy session, means never. So repair on read rather than wait for
 * one. Deliberately narrow: it only fires on the tell-tale lead-byte pair, bails if any character is
 * outside the byte range, and decodes with `fatal` so text that merely contains "Ã" is left alone.
 */
function repairMojibake(value: string): string {
  if (!/[Â-Ã][-¿]/.test(value)) return value;
  for (const ch of value) if (ch.charCodeAt(0) > 0xff) return value;
  try {
    const bytes = Uint8Array.from(value, (c) => c.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return value; // not actually mis-decoded UTF-8 — leave it exactly as it was
  }
}

function safeParse(raw: string | null): GoogleProfile | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as GoogleProfile;
    if (typeof parsed?.name === "string") parsed.name = repairMojibake(parsed.name);
    return parsed;
  } catch {
    return null;
  }
}

// Hydrate from storage once, on the client, and keep tabs in sync.
if (typeof window !== "undefined") {
  current = safeParse(window.localStorage.getItem(KEY));
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    current = safeParse(e.newValue);
    listeners.forEach((l) => l());
  });
}

export function getProfile(): GoogleProfile | null {
  return current;
}

export function setProfile(profile: GoogleProfile | null): void {
  current = profile;
  setAuthExpired(false);
  try {
    if (profile) window.localStorage.setItem(KEY, JSON.stringify(profile));
    else window.localStorage.removeItem(KEY);
  } catch {
    /* storage may be unavailable (private mode, etc.) */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** React hook: the current signed-in user, or null. SSR-safe (renders null until hydrated). */
export function useGoogleUser(): GoogleProfile | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
}

// ── Server session liveness ───────────────────────────────────────────────────
// The profile above is UI state and never expires; the httpOnly session cookie does. When those two
// disagree the app must not quietly render the user as free — it says the session lapsed and offers
// to restore it. Kept here rather than prop-drilled so the topbar and Settings can both read it.

let expired = false;
const expiredListeners = new Set<() => void>();

export function setAuthExpired(value: boolean): void {
  if (expired === value) return;
  expired = value;
  expiredListeners.forEach((l) => l());
}

export function isAuthExpired(): boolean {
  return expired;
}

/** React hook: true when we hold a profile but the server no longer accepts our session. */
export function useAuthExpired(): boolean {
  return useSyncExternalStore(
    (cb) => {
      expiredListeners.add(cb);
      return () => expiredListeners.delete(cb);
    },
    () => expired,
    () => false,
  );
}
