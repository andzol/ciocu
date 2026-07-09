"use client";

import { useEffect, useRef, useState } from "react";
import { setProfile, useGoogleUser } from "@/lib/auth/session";

// ── Google Identity Services (GIS) sign-in ──────────────────────────────────────
// Signed out: renders Google's "Sign in with Google" button. On sign-in, the token is
// verified server-side (/api/auth) before we trust it — then the verified profile (name /
// email / picture) is stored in the shared session and the button becomes an account chip.

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

interface CredentialResponse {
  credential: string;
}
interface GoogleId {
  initialize(config: {
    client_id: string;
    callback: (res: CredentialResponse) => void;
    auto_select?: boolean;
  }): void;
  renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
  disableAutoSelect(): void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

export default function GoogleAuth() {
  const profile = useGoogleUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const buttonHostRef = useRef<HTMLDivElement>(null);
  const chipRef = useRef<HTMLDivElement>(null);

  // Load the GIS script once, initialize, and render Google's button when signed out.
  useEffect(() => {
    if (!CLIENT_ID || profile) return;

    let cancelled = false;

    function init() {
      const id = window.google?.accounts?.id;
      if (!id || cancelled || !buttonHostRef.current) return;
      id.initialize({
        client_id: CLIENT_ID,
        auto_select: false,
        callback: async (res) => {
          // Verify server-side; only a Google-signed token minted for us is trusted.
          try {
            const r = await fetch("/api/auth", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ credential: res.credential }),
            });
            if (!r.ok) return;
            const p = await r.json();
            if (p?.email) setProfile(p);
          } catch {
            /* network hiccup — user can retry the button */
          }
        },
      });
      buttonHostRef.current.replaceChildren();
      id.renderButton(buttonHostRef.current, {
        type: "standard",
        theme: "filled_black",
        size: "medium",
        shape: "pill",
        text: "signin",
      });
    }

    if (window.google?.accounts?.id) {
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
  }, [profile]);

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
    window.google?.accounts?.id?.disableAutoSelect();
    setProfile(null);
    setMenuOpen(false);
  }

  if (!CLIENT_ID) {
    // No client id configured — render nothing rather than a dead button.
    return null;
  }

  if (!profile) {
    return <div ref={buttonHostRef} className="google-auth-button" />;
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
