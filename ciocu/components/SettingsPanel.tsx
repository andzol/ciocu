"use client";

import { useEffect, useState } from "react";
import { X, SignOut, Lightning } from "@phosphor-icons/react";
import { useGoogleUser } from "@/lib/auth/session";
import { SIGN_OUT_REQUEST_EVENT } from "@/components/SignOutConfirm";
import { useUsage } from "@/lib/usage/ledger";
import { FREE_MESSAGE_LIMIT, TIER_RANK, type Tier } from "@/lib/usage/rates";
import { CHECKOUT_ENABLED, TOPUP_URL, openCheckout, openTopup } from "@/lib/billing/checkout";
import { PLAN_CARDS, formatPrice, loadPlanPrices, type PlanPrice } from "@/lib/billing/plans";
import { STT_LANGUAGES, setVoiceLang, setVoiceProvider, useVoicePrefs } from "@/lib/voice/prefs";


// Just the plan's name. The price deliberately isn't here — it lives with the payment provider, and the one
// that used to sit in this label ("Basic — $19.99/mo") is exactly the kind of copy that goes stale
// the moment the dashboard changes. The pricing table reads it live instead.
const TIER_LABEL: Record<string, string> = {
  none: "Free",
  basic: "Basic",
  standard: "Standard",
  pro: "Pro",
};

export default function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const user = useGoogleUser();
  const usage = useUsage();
  const voice = useVoicePrefs();
  const [hint, setHint] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, PlanPrice> | null>(null);

  // The plan table is an UPGRADE table: it shows the tier you're on plus everything above it, and
  // nothing below. That's not cosmetic — each plan is a separate product and the provider has no
  // plan-switch, so "buying" a cheaper plan while subscribed would open a SECOND subscription and
  // bill you twice. Pro has nothing above it, so it sees no table at all.
  const currentTier: Tier = usage?.tier ?? "none";
  const showPlans = CHECKOUT_ENABLED && currentTier !== "pro";
  const offered = PLAN_CARDS.filter((c) => TIER_RANK[c.tier] >= TIER_RANK[currentTier]);

  // Live prices for the plan table (the provider is the source of truth; see lib/billing/plans.ts).
  useEffect(() => {
    if (!open || !showPlans || prices) return;
    let cancelled = false;
    void loadPlanPrices().then((p) => {
      if (!cancelled) setPrices(p);
    });
    return () => {
      cancelled = true;
    };
  }, [open, showPlans, prices]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  // Ask first — signing out clears this device's memory now (see SignOutConfirm).
  function signOut() {
    window.dispatchEvent(new Event(SIGN_OUT_REQUEST_EVENT));
  }

  const pctUsed = Math.round((usage?.fractionUsed ?? 0) * 100);
  const renewsLabel = usage?.renewsAt
    ? new Date(usage.renewsAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : null;
  const canTopUp = Boolean(user && TOPUP_URL && usage && usage.tier !== "none");

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        /* Three plan columns don't fit the default 440px panel — widen only while they're shown. */
        className={`modal-panel${showPlans ? " modal-panel--wide" : ""}`}
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
              /* The "subscribe to unlock…" blurb used to live here; the plan table below now says
                 the same thing with the prices attached. */
              <p className="settings-usage-line">
                <strong>{usage.freeMessagesLeft ?? 0}</strong> of {FREE_MESSAGE_LIMIT} free messages
                left
              </p>
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
                  <span className="usage-pct">
                    {pctUsed}% <Lightning size={13} weight="fill" className="energy-icon" /> used
                  </span>
                </div>

                <p className="settings-muted settings-usage-approx">
                  {renewsLabel ? `Renews ${renewsLabel}` : "Resets monthly"}
                </p>

                {usage.voiceThrottled && (
                  <p className="settings-warn">
                    You&apos;re out of energy for this period — top up to keep going, or wait until it
                    renews{renewsLabel ? ` on ${renewsLabel}` : ""}.
                  </p>
                )}
              </>
            )}

            {/* Top up this period's credits. There's no "Upgrade plan" button any more — with three
                paid tiers it couldn't say WHICH plan; the table below names them and their prices. */}
            {canTopUp && (
              <div className="settings-actions">
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
              </div>
            )}
          </section>

          {/* ── Plans — your tier and everything above it (see `offered`) ───────────── */}
          {showPlans && (
            <section className="settings-section">
              <h3 className="settings-heading">
                {currentTier === "none" ? "Plans" : "Upgrade"}
              </h3>
              <div className={`plan-grid plan-grid--${offered.length}`}>
                {offered.map((card) => {
                  const isCurrent = card.tier === currentTier;
                  const isFree = card.tier === "none";
                  const live = isFree ? null : prices?.[card.tier];
                  const per = live?.interval === "year" ? "/yr" : "/mo";
                  return (
                    <div
                      key={card.tier}
                      className={`plan-card${isCurrent ? " plan-card--current" : ""}`}
                    >
                      <h4 className="plan-name">{card.name}</h4>
                      <p className="plan-tagline">{card.tagline}</p>

                      <p className="plan-price">
                        {isFree ? (
                          <>
                            <span className="plan-price-amount">$0</span>
                          </>
                        ) : live?.priceCents != null ? (
                          <>
                            <span className="plan-price-amount">{formatPrice(live.priceCents)}</span>
                            <span className="plan-price-per">{per}</span>
                          </>
                        ) : prices ? (
                          /* the provider didn't give us a price. Say so — never guess one, it's what they pay. */
                          <span className="plan-price-unknown">See price at checkout</span>
                        ) : (
                          <span className="plan-price-unknown">…</span>
                        )}
                      </p>

                      {isCurrent ? (
                        <button type="button" className="plan-btn plan-btn--current" disabled>
                          Current plan
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="plan-btn"
                          onClick={() => {
                            // Checkout is verified by email, so sign-in comes first — the paid email
                            // must match the Google one Ciocu checks (see lib/billing/provider.ts).
                            if (!user) {
                              setHint("Sign in with Google (top left) to subscribe.");
                              return;
                            }
                            // Only paid tiers above the current one reach here — `offered` filters
                            // out everything lower, and the current tier renders "Current plan".
                            openCheckout(card.tier as "basic" | "standard" | "pro", user.email);
                            onClose();
                          }}
                        >
                          Get {card.name}
                        </button>
                      )}

                      <ul className="plan-features">
                        {card.features.map((f) => (
                          <li key={f}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
              {hint && <p className="settings-warn">{hint}</p>}
            </section>
          )}

          {/* ── Voice (subscribers only — free users are on Google either way) ─────── */}
          {usage && usage.tier !== "none" && (
            <section className="settings-section">
              <h3 className="settings-heading">Voice</h3>
              <p className="settings-muted settings-usage-approx">
                How your speech becomes text. She only listens while she can see you, whichever you
                pick.
              </p>
              <ul className="opt-list">
                <li className="opt-row">
                  <label className="opt-item">
                    <input
                      type="radio"
                      name="stt-provider"
                      className="opt-radio"
                      checked={voice.provider === "soniox"}
                      onChange={() => setVoiceProvider("soniox")}
                    />
                    <span className="opt-name">
                      Soniox
                      <Lightning
                        size={14}
                        weight="fill"
                        className="energy-icon"
                        aria-label="Uses energy while you speak"
                      />
                    </span>
                  </label>
                </li>
                {voice.provider === "soniox" && (
                  <li className="stt-note">Real-time and more accurate. Detects your language on its own.</li>
                )}

                <li className="opt-row">
                  <label className="opt-item">
                    <input
                      type="radio"
                      name="stt-provider"
                      className="opt-radio"
                      checked={voice.provider === "google"}
                      onChange={() => setVoiceProvider("google")}
                    />
                    <span className="opt-name">
                      Google
                      <span className="opt-free" title="Never uses your energy">
                        free
                      </span>
                    </span>
                  </label>
                  {voice.provider === "google" && (
                    <select
                      className="stt-lang"
                      aria-label="Language Google listens for"
                      value={voice.lang}
                      onChange={(e) => setVoiceLang(e.target.value)}
                    >
                      {STT_LANGUAGES.map((l) => (
                        <option key={l.code || "auto"} value={l.code}>
                          {l.label}
                        </option>
                      ))}
                    </select>
                  )}
                </li>
                {voice.provider === "google" && (
                  <li className="stt-note">
                    Your browser&apos;s own recognition — costs no energy, but it has to be told which
                    language to expect, and works best in Chrome.
                  </li>
                )}
              </ul>
            </section>
          )}

        </div>

      </div>
    </div>
  );
}
