"use client";

import { useEffect, useState } from "react";
import { X, SignOut, Info, Lightning } from "@phosphor-icons/react";
import { setProfile, useGoogleUser } from "@/lib/auth/session";
import { toggleKnowledge, useEnabledKnowledge } from "@/lib/knowledge/enabled";
import { useUsage } from "@/lib/usage/ledger";
import { FREE_MESSAGE_LIMIT } from "@/lib/usage/rates";
import { CHECKOUT_URL, TOPUP_URL, openCheckout, openTopup } from "@/lib/billing/checkout";
import { PLAN_CARDS, formatPrice, loadPlanPrices, type PlanPrice } from "@/lib/billing/plans";
import { STT_LANGUAGES, setVoiceLang, setVoiceProvider, useVoicePrefs } from "@/lib/voice/prefs";

import { loadBases, type KnowledgeBase } from "@/lib/knowledge/bases";

// Dark, arrow-less scrollbar for the description card. Injected into the (same-origin) iframe on
// load so every card matches the app without each HTML file having to style its own scrollbar.
// Uses the card's own theme vars (--rule/--muted) so it tracks light/dark.
const CARD_SCROLLBAR_CSS = `
  html { scrollbar-width: thin; scrollbar-color: var(--rule, #24242e) transparent; }
  ::-webkit-scrollbar { width: 10px; height: 10px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb {
    background: var(--rule, #24242e);
    border-radius: 999px;
    border: 3px solid transparent;
    background-clip: padding-box;
  }
  ::-webkit-scrollbar-thumb:hover { background: var(--muted, #72728a); }
`;

function styleIframeScrollbar(e: React.SyntheticEvent<HTMLIFrameElement>): void {
  try {
    const doc = e.currentTarget.contentDocument;
    if (!doc) return;
    const style = doc.createElement("style");
    style.textContent = CARD_SCROLLBAR_CSS;
    doc.head.appendChild(style);
  } catch {
    /* cross-origin or not ready — leave the default scrollbar */
  }
}

// Just the plan's name. The price deliberately isn't here — it lives in Lemon Squeezy, and the one
// that used to sit in this label ("Basic — $19.99/mo") is exactly the kind of copy that goes stale
// the moment the dashboard changes. The pricing table reads it live instead.
const TIER_LABEL: Record<string, string> = {
  none: "Free",
  basic: "Basic",
  pro: "Pro",
};

export default function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const user = useGoogleUser();
  const usage = useUsage();
  const tier = usage?.tier;
  const voice = useVoicePrefs();
  const enabledKnowledge = useEnabledKnowledge();
  const [bases, setBases] = useState<KnowledgeBase[]>([]);
  // Which bases have a description card available (id → its URL), and the one being viewed.
  const [infoUrls, setInfoUrls] = useState<Record<string, string>>({});
  const [infoView, setInfoView] = useState<{ title: string; url: string } | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, PlanPrice> | null>(null);

  // Anyone who isn't paying sees the plans — signed out or signed in, the choice is the same one.
  const onFreeTier = usage?.tier === "none";

  // Live prices for the plan table (LS is the source of truth; see lib/billing/plans.ts).
  useEffect(() => {
    if (!open || !onFreeTier || prices) return;
    let cancelled = false;
    void loadPlanPrices().then((p) => {
      if (!cancelled) setPrices(p);
    });
    return () => {
      cancelled = true;
    };
  }, [open, onFreeTier, prices]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Load the available knowledge bases (LlamaCloud pipelines) when the panel opens, then probe for
  // each base's optional description card (a static HTML file) so we only show the info link when
  // one actually exists.
  useEffect(() => {
    // Knowledge is a subscriber feature (bases run on the monthly energy allowance), so free users
    // never list bases — no need to hit LlamaCloud for them.
    if (!open || !tier || tier === "none") return;
    let cancelled = false;
    loadBases()
      .then((list) => {
        if (cancelled) return;
        setBases(list);
        list.forEach((b) => {
          if (!b.name) return;
          const url = `/knowledge/${b.name}-knowledge-description.html`;
          fetch(url, { method: "HEAD" })
            .then((r) => {
              if (!cancelled && r.ok) setInfoUrls((prev) => ({ ...prev, [b.id]: url }));
            })
            .catch(() => {});
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, tier]);

  if (!open) return null;

  function signOut() {
    void fetch("/api/auth", { method: "DELETE" }); // clear the server session cookie
    setProfile(null);
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
        className={`modal-panel${onFreeTier && CHECKOUT_URL ? " modal-panel--wide" : ""}`}
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

            {/* Actions for people already paying: top up this period, and/or move up a plan. Free
                users don't get a Subscribe button here — they get the plan table below, which shows
                what they'd be buying before asking them to buy it. */}
            {(canTopUp || (CHECKOUT_URL && usage?.tier === "basic")) && (
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
                {CHECKOUT_URL && usage?.tier === "basic" && (
                  <button
                    type="button"
                    className={usage.voiceThrottled && canTopUp ? "btn-ghost" : "btn-primary"}
                    onClick={() => {
                      openCheckout(user!.email);
                      onClose();
                    }}
                  >
                    Upgrade plan
                  </button>
                )}
              </div>
            )}
          </section>

          {/* ── Plans (only while you're on the free tier — signed out or in) ───────── */}
          {onFreeTier && CHECKOUT_URL && (
            <section className="settings-section">
              <h3 className="settings-heading">Plans</h3>
              <div className="plan-grid">
                {PLAN_CARDS.map((card) => {
                  const isCurrent = card.tier === "none";
                  const live = card.tier === "none" ? null : prices?.[card.tier];
                  const per = live?.interval === "year" ? "/yr" : "/mo";
                  return (
                    <div
                      key={card.tier}
                      className={`plan-card${isCurrent ? " plan-card--current" : ""}`}
                    >
                      <h4 className="plan-name">{card.name}</h4>
                      <p className="plan-tagline">{card.tagline}</p>

                      <p className="plan-price">
                        {isCurrent ? (
                          <>
                            <span className="plan-price-amount">$0</span>
                          </>
                        ) : live?.priceCents != null ? (
                          <>
                            <span className="plan-price-amount">{formatPrice(live.priceCents)}</span>
                            <span className="plan-price-per">{per}</span>
                          </>
                        ) : prices ? (
                          /* LS didn't give us a price. Say so — never guess one, it's what they pay. */
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
                            // Checkout needs an email to bind the subscription to, and LS is our
                            // only customer record — so sign-in has to come first.
                            if (!user) {
                              setHint("Sign in with Google (top left) to subscribe.");
                              return;
                            }
                            openCheckout(user.email);
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
              <ul className="kb-list">
                <li className="kb-row">
                  <label className="kb-item">
                    <input
                      type="radio"
                      name="stt-provider"
                      className="kb-check kb-radio"
                      checked={voice.provider === "soniox"}
                      onChange={() => setVoiceProvider("soniox")}
                    />
                    <span className="kb-name">
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

                <li className="kb-row">
                  <label className="kb-item">
                    <input
                      type="radio"
                      name="stt-provider"
                      className="kb-check kb-radio"
                      checked={voice.provider === "google"}
                      onChange={() => setVoiceProvider("google")}
                    />
                    <span className="kb-name">
                      Google
                      <span className="kb-free" title="Never uses your energy">
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

          {/* ── Knowledge (subscribers only — bases run on your monthly energy) ─────── */}
          {usage && usage.tier !== "none" && (
          <section className="settings-section">
            <h3 className="settings-heading">Knowledge</h3>
            <p className="settings-muted settings-usage-approx">
              Reference knowledge Ciocu can draw on. Each base you switch on is searched on every
              message — so more active bases use more energy. Bases marked <em>free</em> never touch
              your allowance.
            </p>
            {bases.length === 0 ? (
              <p className="settings-muted">No knowledge bases available yet.</p>
            ) : (
              <ul className="kb-list">
                {bases.map((b) => (
                  <li key={b.id} className="kb-row">
                    <label className="kb-item">
                      <input
                        type="checkbox"
                        className="kb-check"
                        checked={enabledKnowledge.includes(b.id)}
                        onChange={(e) => toggleKnowledge(b.id, e.target.checked)}
                      />
                      <span className="kb-name">
                        {b.title}
                        {b.free ? (
                          <span className="kb-free" title="Never uses your energy">
                            free
                          </span>
                        ) : (
                          <Lightning
                            size={14}
                            weight="fill"
                            className="energy-icon"
                            aria-label="Uses extra energy when active"
                          />
                        )}
                        {b.adult && (
                          <span className="kb-adult" title="Adult material — you must be 18 or older">
                            18+
                          </span>
                        )}
                      </span>
                    </label>
                    {infoUrls[b.id] && (
                      <button
                        type="button"
                        className="kb-info-btn"
                        aria-label={`About ${b.title}`}
                        title={`About ${b.title}`}
                        onClick={() => setInfoView({ title: b.title, url: infoUrls[b.id] })}
                      >
                        <Info size={17} weight="regular" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
          )}
        </div>

        {/* Description card for a knowledge base — the base's own standalone HTML, in an iframe. */}
        {infoView && (
          <div
            className="kb-info-modal"
            onMouseDown={(e) => {
              e.stopPropagation();
              setInfoView(null);
            }}
          >
            <div className="kb-info-card" onMouseDown={(e) => e.stopPropagation()}>
              <header className="modal-header">
                <h2 className="modal-title">{infoView.title}</h2>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Close description"
                  onClick={() => setInfoView(null)}
                >
                  <X size={20} />
                </button>
              </header>
              <iframe
                className="kb-info-frame"
                src={infoView.url}
                title={infoView.title}
                onLoad={styleIframeScrollbar}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
