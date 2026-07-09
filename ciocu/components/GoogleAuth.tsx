"use client";

import { useEffect, useRef, useState } from "react";
import { setProfile, useGoogleUser } from "@/lib/auth/session";

// ── Google sign-in (OAuth token flow) ───────────────────────────────────────────
// We use Google's OAuth token flow (initTokenClient) rather than the rendered GIS button, so the
// sign-in control is OUR own button — fully themeable AND clickable (the rendered GIS button can't
// be restyled and blocks clicks when skinned). On click Google returns an access token; we fetch
// the user's profile for the chip and POST the token to /api/auth to open the verified session.

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

interface TokenResponse {
  access_token?: string;
}
interface TokenClient {
  requestAccessToken: () => void;
}
interface GoogleOAuth2 {
  initTokenClient(config: {
    client_id: string;
    scope: string;
    callback: (res: TokenResponse) => void;
  }): TokenClient;
}
declare global {
  interface Window {
    google?: { accounts: { oauth2: GoogleOAuth2 } };
  }
}

// Google's 4-color "G".
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
  const [menuOpen, setMenuOpen] = useState(false);
  const tokenClientRef = useRef<TokenClient | null>(null);
  const chipRef = useRef<HTMLDivElement>(null);

  // Load the GIS script once and initialize the OAuth token client.
  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;

    function init() {
      const oauth2 = window.google?.accounts?.oauth2;
      if (!oauth2 || cancelled || tokenClientRef.current) return;
      tokenClientRef.current = oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: "openid email profile",
        callback: (res) => {
          const token = res.access_token;
          if (!token) return;
          // 1) Fetch the profile for the chip (best-effort display).
          fetch("https://openidconnect.googleapis.com/v1/userinfo", {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then((r) => (r.ok ? r.json() : null))
            .then((p) => {
              if (p?.email) setProfile({ sub: p.sub, name: p.name, email: p.email, picture: p.picture });
            })
            .catch(() => {});
          // 2) Open the verified server session (httpOnly cookie that gates paid features).
          fetch("/api/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ access_token: token }),
          }).catch(() => {});
        },
      });
    }

    if (window.google?.accounts?.oauth2) {
      init();
      return;
    }
    const src = "https://accounts.google.com/gsi/client";
    let script = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (!script) {
      script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", init);
    return () => {
      cancelled = true;
      script?.removeEventListener("load", init);
    };
  }, []);

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

  function signOut() {
    void fetch("/api/auth", { method: "DELETE" }); // clear the server session cookie
    setProfile(null);
    setMenuOpen(false);
  }

  if (!CLIENT_ID) {
    // No client id configured — render nothing rather than a dead button.
    return null;
  }

  if (!profile) {
    // Our own themed button; clicking triggers Google's token popup (see the token client above).
    return (
      <button
        type="button"
        className="google-signin-btn"
        onClick={() => tokenClientRef.current?.requestAccessToken()}
      >
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
          <button type="button" role="menuitem" className="menu-item" onClick={signOut}>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
