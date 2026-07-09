"use client";

import { useEffect } from "react";
import { X, SignOut } from "@phosphor-icons/react";
import { setProfile, useGoogleUser } from "@/lib/auth/session";
import { useUsage } from "@/lib/usage/ledger";
import { CREDITS_PER_CHAT_MESSAGE, CREDITS_PER_VOICE_MINUTE } from "@/lib/usage/rates";
import { CHECKOUT_URL, openCheckout } from "@/lib/billing/checkout";

const TIER_LABEL: Record<string, string> = {
  none: "Free",
  basic: "Basic — $19.99/mo",
  pro: "Pro — $99.99/mo",
};

export default function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const user = useGoogleUser();
  const usage = useUsage();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function signOut() {
    window.google?.accounts?.id?.disableAutoSelect();
    setProfile(null);
  }

  // Human-readable "what's left": voice minutes and messages the remaining credits could buy.
  const remaining = usage?.remaining ?? 0;
  const voiceMinLeft = Math.round(remaining / CREDITS_PER_VOICE_MINUTE);
  const messagesLeft = Math.round(remaining / CREDITS_PER_CHAT_MESSAGE);
  const pctUsed = Math.round((usage?.fractionUsed ?? 0) * 100);

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <h2 className="modal-title">Settings</h2>
          <button type="button" className="icon-button" aria-label="Close settings" onClick={onClose}>
            <X size={20} />
          </button>
        </header>

        <div className="modal-body">
          {/* ── Account ─────────────────────────────────────────────── */}
          <section className="settings-section">
            <h3 className="settings-heading">Account</h3>
            {user ? (
              <div className="settings-account">
                {/* eslint-disable-next-line @next/next/no-img-element -- Google avatar, external host */}
                <img
                  className="account-avatar account-avatar--lg"
                  src={user.picture}
                  alt=""
                  referrerPolicy="no-referrer"
                />
                <div className="account-meta">
                  <span className="account-meta-name">{user.name}</span>
                  <span className="account-meta-email">{user.email}</span>
                </div>
                <button type="button" className="btn-ghost" onClick={signOut}>
                  <SignOut size={18} /> Sign out
                </button>
              </div>
            ) : (
              <p className="settings-muted">Sign in with Google (top left) to subscribe and sync.</p>
            )}
          </section>

          {/* ── Usage ───────────────────────────────────────────────── */}
          <section className="settings-section">
            <div className="settings-heading-row">
              <h3 className="settings-heading">Monthly energy</h3>
              <span className="settings-tier">{TIER_LABEL[usage?.tier ?? "none"]}</span>
            </div>

            {usage ? (
              <>
                <div
                  className={`meter${usage.voiceThrottled ? " meter--low" : ""}`}
                  role="progressbar"
                  aria-valuenow={pctUsed}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div className="meter-fill" style={{ width: `${pctUsed}%` }} />
                </div>

                <p className="settings-usage-line">
                  <strong>{usage.remaining}</strong> of {usage.allowance} credits left
                  <span className="settings-muted"> · {pctUsed}% used</span>
                </p>

                <p className="settings-muted settings-usage-approx">
                  ≈ {voiceMinLeft} min of voice, or {messagesLeft.toLocaleString()} messages · resets
                  monthly
                </p>

                {usage.voiceThrottled && (
                  <p className="settings-warn">
                    Voice is paused to protect your balance — text still works.
                  </p>
                )}
              </>
            ) : (
              <p className="settings-muted">Loading…</p>
            )}

            {/* Upgrade / subscribe */}
            {user && CHECKOUT_URL && usage?.tier !== "pro" && (
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  openCheckout(user.email);
                  onClose();
                }}
              >
                {usage?.tier === "basic" ? "Upgrade plan" : "Subscribe"}
              </button>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
