"use client";

// What Ciocu knows — its own panel, not a Settings section.
//
// It lived under Settings, which was the wrong shelf: there is nothing here to set. Since knowledge
// was consolidated into one index consulted automatically, this is an editorial page about who she
// is, and burying it among toggles both hid it and mislabelled it.
//
// Free and signed-out visitors get the same argument with the detail withheld — they should be able
// to see what the plan buys before deciding, not a blank wall.

import { useEffect } from "react";
import { X, Sparkle } from "@phosphor-icons/react";
import { useUsage } from "@/lib/usage/ledger";
import {
  KNOWLEDGE_DOMAINS,
  KNOWLEDGE_HEADLINE,
  KNOWLEDGE_HOOKS,
  KNOWLEDGE_LEAD,
  KNOWLEDGE_STRENGTHS,
} from "@/lib/knowledge/topics";

export default function KnowledgePanel({
  open,
  onClose,
  onSeePlans,
}: {
  open: boolean;
  onClose: () => void;
  onSeePlans: () => void;
}) {
  const usage = useUsage();
  // Same gate as her retrieval: paid tiers only. While usage is still null we withhold rather than
  // flash the full page and snatch it back a moment later.
  const entitled = Boolean(usage && usage.tier !== "none");

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="kn-backdrop" onClick={onClose}>
      <div
        className="kn-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="kn-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="icon-button kn-close" aria-label="Close" onClick={onClose}>
          <X size={20} />
        </button>

        <article className="kn-doc">
          <p className="kn-eyebrow">What Ciocu knows</p>
          <h1 id="kn-title" className="kn-h1">
            {KNOWLEDGE_HEADLINE}
          </h1>
          <p className="kn-lead">{KNOWLEDGE_LEAD}</p>

          <h2 className="kn-h2">What she&apos;s actually good at</h2>
          <ul className="kn-strengths">
            {KNOWLEDGE_STRENGTHS.map((s) => (
              <li key={s.title}>
                <h3 className="kn-h3">{s.title}</h3>
                <p>{s.body}</p>
              </li>
            ))}
          </ul>

          {entitled ? (
            <>
              <h2 className="kn-h2">What she can go deep on</h2>
              <div className="kn-domains">
                {KNOWLEDGE_DOMAINS.map((d) => (
                  <span className="kn-domain" key={d}>
                    {d}
                  </span>
                ))}
              </div>

              <h2 className="kn-h2">Worth asking her about</h2>
              <ul className="kn-topics">
                {KNOWLEDGE_HOOKS.map((h) => (
                  <li key={h.title}>
                    <strong>{h.title}</strong> — {h.body}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="kn-locked">
              <h2 className="kn-h2 kn-h2--flush">
                <Sparkle size={18} weight="regular" /> Her deeper knowledge starts with Basic
              </h2>
              <p>
                {`On the free plan she's still herself — she just answers from what she already ` +
                  `knows. From Basic upward she also draws on a curated library on ` +
                  `consciousness, psychology and the inner life — automatically, whenever a ` +
                  `conversation goes somewhere it can help.`}
              </p>
              <button type="button" className="import-btn import-btn--primary" onClick={onSeePlans}>
                See the plans
              </button>
            </div>
          )}
        </article>
      </div>
    </div>
  );
}
