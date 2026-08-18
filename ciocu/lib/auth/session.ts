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
const listeners = new Set<() => void>();
let current: GoogleProfile | null = null;

function safeParse(raw: string | null): GoogleProfile | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GoogleProfile;
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
