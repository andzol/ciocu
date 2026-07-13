"use client";

import { useEffect, useState } from "react";
import { X, SignOut, Info, Lightning } from "@phosphor-icons/react";
import { setProfile, useGoogleUser } from "@/lib/auth/session";
import { toggleKnowledge, useEnabledKnowledge } from "@/lib/knowledge/enabled";
import { useUsage } from "@/lib/usage/ledger";
import { FREE_MESSAGE_LIMIT } from "@/lib/usage/rates";
import { CHECKOUT_URL, TOPUP_URL, openCheckout, openTopup } from "@/lib/billing/checkout";

interface KnowledgeBase {
  id: string;
  title: string;
  name: string;
}

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

const TIER_LABEL: Record<string, string> = {
  none: "Free",
  basic: "Basic — $19.99/mo",
  pro: "Pro — $99.99/mo",
};

export default function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const user = useGoogleUser();
  const usage = useUsage();
  const enabledKnowledge = useEnabledKnowledge();
  const [bases, setBases] = useState<KnowledgeBase[]>([]);
  // Which bases have a description card available (id → its URL), and the one being viewed.
  const [infoUrls, setInfoUrls] = useState<Record<string, string>>({});
  const [infoView, setInfoView] = useState<{ title: string; url: string } | null>(null);
  const [hint, setHint] = useState<string | null>(null);

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
    if (!open || !usage || usage.tier === "none") return;
    let cancelled = false;
    fetch("/api/knowledge")
      .then((r) => (r.ok ? r.json() : { bases: [] }))
      .then((d) => {
        if (cancelled) return;
        const list: KnowledgeBase[] = Array.isArray(d?.bases) ? d.bases : [];
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
  }, [open, usage?.tier]);

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

            {/* Actions: top up this period's credits, and/or subscribe/upgrade. Free users see a
                Subscribe button too (clicking prompts sign-in, since checkout needs their email). */}
            {(canTopUp || (CHECKOUT_URL && usage && usage.tier !== "pro")) && (
              <>
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
                  {CHECKOUT_URL && usage && usage.tier !== "pro" && (
                    <button
                      type="button"
                      className={usage.voiceThrottled && canTopUp ? "btn-ghost" : "btn-primary"}
                      onClick={() => {
                        if (!user) {
                          setHint("Sign in with Google (top left) to subscribe.");
                          return;
                        }
                        openCheckout(user.email);
                        onClose();
                      }}
                    >
                      {usage.tier === "basic" ? "Upgrade plan" : "Subscribe"}
                    </button>
                  )}
                </div>
                {hint && <p className="settings-warn">{hint}</p>}
              </>
            )}
          </section>

          {/* ── Knowledge (subscribers only — bases run on your monthly energy) ─────── */}
          {usage && usage.tier !== "none" && (
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
                        <Lightning
                          size={14}
                          weight="fill"
                          className="energy-icon"
                          aria-label="Uses extra energy when active"
                        />
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
