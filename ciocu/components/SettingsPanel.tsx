"use client";

import { useEffect, useState } from "react";
import { X, SignOut } from "@phosphor-icons/react";
import { setProfile, useGoogleUser } from "@/lib/auth/session";
import { toggleKnowledge, useEnabledKnowledge } from "@/lib/knowledge/enabled";
import { useUsage } from "@/lib/usage/ledger";
import {
  CREDITS_PER_CHAT_MESSAGE,
  CREDITS_PER_VOICE_MINUTE,
  FREE_MESSAGE_LIMIT,
} from "@/lib/usage/rates";
import { CHECKOUT_URL, TOPUP_URL, openCheckout, openTopup } from "@/lib/billing/checkout";

const TIER_LABEL: Record<string, string> = {
  none: "Free",
  basic: "Basic — $19.99/mo",
  pro: "Pro — $99.99/mo",
};

export default function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const user = useGoogleUser();
  const usage = useUsage();
  const enabledKnowledge = useEnabledKnowledge();
  const [bases, setBases] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Load the available knowledge bases (LlamaCloud pipelines) when the panel opens.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/knowledge")
      .then((r) => (r.ok ? r.json() : { bases: [] }))
      .then((d) => {
        if (!cancelled) setBases(Array.isArray(d?.bases) ? d.bases : []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  function signOut() {
    void fetch("/api/auth", { method: "DELETE" }); // clear the server session cookie
    setProfile(null);
  }

  // Human-readable "what's left": voice minutes and messages the remaining credits could buy.
  const remaining = usage?.remaining ?? 0;
  const voiceMinLeft = Math.round(remaining / CREDITS_PER_VOICE_MINUTE);
  const messagesLeft = Math.round(remaining / CREDITS_PER_CHAT_MESSAGE);
  const pctUsed = Math.round((usage?.fractionUsed ?? 0) * 100);
  const renewsLabel = usage?.renewsAt
    ? new Date(usage.renewsAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : null;
  const canTopUp = Boolean(user && TOPUP_URL && usage && usage.tier !== "none");

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
              <h3 className="settings-heading">Monthly usage</h3>
              <span className="settings-tier">{TIER_LABEL[usage?.tier ?? "none"]}</span>
            </div>

            {!usage ? (
              <p className="settings-muted">Loading…</p>
            ) : usage.tier === "none" ? (
              <>
                <p className="settings-usage-line">
                  <strong>{usage.freeMessagesLeft ?? 0}</strong> of {FREE_MESSAGE_LIMIT} free messages
                  left
                </p>
                <p className="settings-muted settings-usage-approx">
                  Subscribe to unlock real-time voice, a monthly energy allowance, and Ciocu
                  remembering you.
                </p>
              </>
            ) : (
              <>
                {/* One bar, with the percentage read out beside it (monthly subscription). */}
                <div className="usage-bar-row">
                  <div
                    className={`meter${usage.voiceThrottled ? " meter--low" : ""}`}
                    role="progressbar"
                    aria-valuenow={pctUsed}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div className="meter-fill" style={{ width: `${pctUsed}%` }} />
                  </div>
                  <span className="usage-pct">{pctUsed}% used</span>
                </div>

                <p className="settings-muted settings-usage-approx">
                  {renewsLabel ? `Renews ${renewsLabel}` : "Resets monthly"} ·{" "}
                  {usage.remaining.toLocaleString()} of {usage.allowance.toLocaleString()} credits left
                  {usage.topupCredits > 0 && ` · incl. ${usage.topupCredits.toLocaleString()} top-up`}
                </p>
                <p className="settings-muted settings-usage-approx">
                  ≈ {voiceMinLeft} min of voice, or {messagesLeft.toLocaleString()} messages
                </p>

                {usage.voiceThrottled && (
                  <p className="settings-warn">
                    You&apos;re out of energy for this period — top up to keep going, or wait until it
                    renews{renewsLabel ? ` on ${renewsLabel}` : ""}.
                  </p>
                )}
              </>
            )}

            {/* Actions: top up this period's credits, and/or change plan. */}
            {(canTopUp || (user && CHECKOUT_URL && usage?.tier !== "pro")) && (
              <div className="settings-actions">
                {canTopUp && (
                  <button
                    type="button"
                    className={usage?.voiceThrottled ? "btn-primary" : "btn-ghost"}
                    onClick={() => {
                      openTopup(user!.email);
                      onClose();
                    }}
                  >
                    Top up
                  </button>
                )}
                {user && CHECKOUT_URL && usage?.tier !== "pro" && (
                  <button
                    type="button"
                    className={usage?.voiceThrottled && canTopUp ? "btn-ghost" : "btn-primary"}
                    onClick={() => {
                      openCheckout(user.email);
                      onClose();
                    }}
                  >
                    {usage?.tier === "basic" ? "Upgrade plan" : "Subscribe"}
                  </button>
                )}
              </div>
            )}
          </section>

          {/* ── Knowledge ───────────────────────────────────────────── */}
          <section className="settings-section">
            <h3 className="settings-heading">Knowledge</h3>
            <p className="settings-muted settings-usage-approx">
              Reference knowledge Ciocu can draw on. Each base you switch on is searched on every
              message — so more active bases use more energy.
            </p>
            {bases.length === 0 ? (
              <p className="settings-muted">No knowledge bases available yet.</p>
            ) : (
              <ul className="kb-list">
                {bases.map((b) => (
                  <li key={b.id}>
                    <label className="kb-item">
                      <input
                        type="checkbox"
                        className="kb-check"
                        checked={enabledKnowledge.includes(b.id)}
                        onChange={(e) => toggleKnowledge(b.id, e.target.checked)}
                      />
                      <span>{b.title}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
