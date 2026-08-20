"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthExpired, useGoogleUser } from "@/lib/auth/session";
import { SIGN_OUT_REQUEST_EVENT } from "@/components/SignOutConfirm";
import {
  completeSignIn,
  ensureTokenClient,
  requestToken,
} from "@/lib/auth/google-client";

// ── Google sign-in (OAuth token flow) ───────────────────────────────────────────
// We use Google's OAuth token flow (initTokenClient) rather than the rendered GIS button, so the
// sign-in control is OUR own button — fully themeable AND clickable (the rendered GIS button can't
// be restyled and blocks clicks when skinned). The flow itself lives in lib/auth/google-client.ts,
// because the subscription sync needs it too: it re-opens a lapsed session with no UI, which is
// impossible if the only way to reach Google is a click on this button.

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

// Google's "G".
function GoogleG() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export default function GoogleAuth() {
  const profile = useGoogleUser();
  const expired = useAuthExpired();
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const chipRef = useRef<HTMLDivElement>(null);

  // Warm the GIS script up front so the first click doesn't wait on a network round-trip, and so a
  // silent re-auth from the subscription sync has a client ready to use.
  useEffect(() => {
    void ensureTokenClient();
  }, []);

  async function signIn() {
    setBusy(true);
    try {
      const token = await requestToken();
      if (token) await completeSignIn(token);
    } finally {
      setBusy(false);
    }
  }

  // Close the account menu on outside click / Escape.
  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (!chipRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // Ask first — signing out clears this device's memory now (see SignOutConfirm).
  function signOut() {
    setMenuOpen(false);
    window.dispatchEvent(new Event(SIGN_OUT_REQUEST_EVENT));
  }

  if (!CLIENT_ID) {
    // No client id configured — render nothing rather than a dead button.
    return null;
  }

  if (!profile) {
    // Our own themed button; clicking triggers Google's token popup (see the token client above).
    return (
      <button type="button" className="google-signin-btn" onClick={signIn} disabled={busy}>
        <GoogleG />
        Sign in
      </button>
    );
  }

  const firstName = profile.name?.split(" ")[0] ?? "You";

  return (
    <div ref={chipRef} className="account-chip-root">
      <button
        type="button"
        className="account-chip"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((v) => !v)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- Google avatar, external host */}
        <img className="account-avatar" src={profile.picture} alt="" referrerPolicy="no-referrer" />
        <span className="account-name">{firstName}</span>
        {expired && <span className="account-warn" aria-hidden="true" />}
      </button>

      {menuOpen && (
        <div className="account-menu" role="menu">
          <div className="account-menu-head">
            {/* eslint-disable-next-line @next/next/no-img-element -- Google avatar, external host */}
            <img
              className="account-avatar account-avatar--lg"
              src={profile.picture}
              alt=""
              referrerPolicy="no-referrer"
            />
            <div className="account-meta">
              <span className="account-meta-name">{profile.name}</span>
              <span className="account-meta-email">{profile.email}</span>
            </div>
          </div>
          {expired && (
            // Silent re-auth already failed (no live Google session, or consent was revoked), so
            // this is the one case that genuinely needs a click. Say so plainly — the alternative is
            // showing a paying customer the free plan and letting them wonder.
            <div className="account-expired">
              <p>Your session expired, so your plan can&apos;t be confirmed.</p>
              <button type="button" className="btn-ghost" onClick={signIn} disabled={busy}>
                {busy ? "Signing in…" : "Sign in again"}
              </button>
            </div>
          )}
          <button type="button" role="menuitem" className="menu-item" onClick={signOut}>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
