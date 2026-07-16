"use client";

import { useEffect, useRef, useState } from "react";
import {
  List,
  X,
  GearSix,
  DownloadSimple,
  UploadSimple,
  Sparkle,
  Gift,
  Books,
  Brain,
  CaretRight,
  Question,
  FileText,
  Envelope,
  ChatCircleText,
  Compass,
  ShieldCheck,
} from "@phosphor-icons/react";
import { useGoogleUser } from "@/lib/auth/session";
import { CHECKOUT_URL, openCheckout } from "@/lib/billing/checkout";
import { findSupportBase, loadBases } from "@/lib/knowledge/bases";
import { toggleKnowledge } from "@/lib/knowledge/enabled";
import { MARKETING_URL, SUPPORT_EMAIL } from "@/lib/support";

interface Item {
  id: string;
  label: string;
  icon: React.ReactNode;
}

// Remaining inert item (wired in a later milestone).
const ITEMS: Item[] = [
  { id: "gift", label: "Gift Ciocu", icon: <Gift size={20} weight="regular" /> },
];

export default function HamburgerMenu({
  onOpenSettings,
  onOpenChat,
}: {
  onOpenSettings: () => void;
  onOpenChat: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const user = useGoogleUser();
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onClick(e: MouseEvent) {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !buttonRef.current?.contains(t)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  // Reset transient state whenever the menu closes.
  useEffect(() => {
    if (!open) {
      setHint(null);
      setMemoryOpen(false);
      setHelpOpen(false);
    }
  }, [open]);

  function handleSubscribe() {
    // Paying requires an identity, so we can attach the payment to a real, verified email.
    if (!user) {
      setHint("Sign in with Google to subscribe.");
      return;
    }
    if (!CHECKOUT_URL) {
      setHint("Checkout isn't configured yet.");
      return;
    }
    openCheckout(user.email);
    setOpen(false);
  }

  function handleSettings() {
    setOpen(false);
    onOpenSettings();
  }

  /**
   * Support = ask Ciocu herself. Switch her own docs on (free — never costs energy) and open the
   * chat straight away, so the user can just type the question. The chat opens either way; the
   * base is a best-effort enrichment.
   */
  function handleSupport() {
    setOpen(false);
    onOpenChat();
    void loadBases().then((bases) => {
      const support = findSupportBase(bases);
      if (support) toggleKnowledge(support.id, true);
    });
  }

  async function handleDownload() {
    try {
      const { serializeMemory } = await import("@/lib/memory/bundle");
      const bundle = await serializeMemory();
      const blob = new Blob([JSON.stringify(bundle)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ciocu-memory-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setOpen(false);
    } catch {
      setHint("Couldn't prepare your memory file.");
    }
  }

  function handleUpload() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const { isBundle, mergeBundle } = await import("@/lib/memory/bundle");
        const data = JSON.parse(await file.text());
        if (!isBundle(data)) {
          setHint("That doesn't look like a Ciocu memory file.");
          return;
        }
        await mergeBundle(data);
        // reload so the restored thread + memories hydrate cleanly
        window.location.reload();
      } catch {
        setHint("Couldn't read that memory file.");
      }
    };
    input.click();
  }

  return (
    <div className="menu-root">
      <button
        ref={buttonRef}
        type="button"
        className="icon-button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X size={22} /> : <List size={22} />}
      </button>

      {open && (
        <div ref={panelRef} className="menu-panel" role="menu">
          {/* Settings & Usage — live. */}
          <button type="button" role="menuitem" className="menu-item" onClick={handleSettings}>
            <span className="menu-item-icon">
              <GearSix size={20} weight="regular" />
            </span>
            <span>Settings &amp; usage</span>
          </button>

          {/* Knowledge — the reference bases she can draw on (toggled in Settings). */}
          <button type="button" role="menuitem" className="menu-item" onClick={handleSettings}>
            <span className="menu-item-icon">
              <Books size={20} weight="regular" />
            </span>
            <span>Knowledge</span>
          </button>

          {/* Memory — one entry that expands to download / upload. */}
          <button
            type="button"
            role="menuitem"
            className="menu-item"
            aria-expanded={memoryOpen}
            onClick={() => setMemoryOpen((v) => !v)}
          >
            <span className="menu-item-icon">
              <Brain size={20} weight="regular" />
            </span>
            <span>Memory</span>
            <CaretRight size={15} weight="bold" className={`menu-caret${memoryOpen ? " menu-caret--open" : ""}`} />
          </button>
          {memoryOpen && (
            <div className="menu-sub">
              <button type="button" role="menuitem" className="menu-item menu-item--sub" onClick={handleDownload}>
                <span className="menu-item-icon">
                  <DownloadSimple size={19} weight="regular" />
                </span>
                <span>Download memory</span>
              </button>
              <button type="button" role="menuitem" className="menu-item menu-item--sub" onClick={handleUpload}>
                <span className="menu-item-icon">
                  <UploadSimple size={19} weight="regular" />
                </span>
                <span>Upload memory</span>
              </button>
            </div>
          )}

          {/* Features — the marketing site. Sits next to Subscribe because it's what you read
              before deciding to pay. A separate subdomain, so it opens in a new tab rather than
              navigating out of a conversation in progress. */}
          <a
            role="menuitem"
            className="menu-item"
            href={MARKETING_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
          >
            <span className="menu-item-icon">
              <Compass size={20} weight="regular" />
            </span>
            <span>Features</span>
          </a>

          {/* Subscribe — gated behind sign-in. */}
          <button type="button" role="menuitem" className="menu-item" onClick={handleSubscribe}>
            <span className="menu-item-icon">
              <Sparkle size={20} weight="regular" />
            </span>
            <span>Subscribe</span>
          </button>

          {/* Help — expands to the legal page and a way to reach a human. */}
          <button
            type="button"
            role="menuitem"
            className="menu-item"
            aria-expanded={helpOpen}
            onClick={() => setHelpOpen((v) => !v)}
          >
            <span className="menu-item-icon">
              <Question size={20} weight="regular" />
            </span>
            <span>Help</span>
            <CaretRight size={15} weight="bold" className={`menu-caret${helpOpen ? " menu-caret--open" : ""}`} />
          </button>
          {helpOpen && (
            <div className="menu-sub">
              <a role="menuitem" className="menu-item menu-item--sub" href="/terms">
                <span className="menu-item-icon">
                  <FileText size={19} weight="regular" />
                </span>
                <span>Terms of use</span>
              </a>
              <a role="menuitem" className="menu-item menu-item--sub" href="/privacy">
                <span className="menu-item-icon">
                  <ShieldCheck size={19} weight="regular" />
                </span>
                <span>Privacy Policy</span>
              </a>
              {/* Support asks Ciocu herself — it opens the chat, it doesn't send mail. It used to
                  carry the envelope, which now belongs to the item that actually emails. */}
              <button
                type="button"
                role="menuitem"
                className="menu-item menu-item--sub"
                onClick={handleSupport}
              >
                <span className="menu-item-icon">
                  <ChatCircleText size={19} weight="regular" />
                </span>
                <span>Support</span>
              </button>
              {/* …and when she can't help, a human. */}
              <a
                role="menuitem"
                className="menu-item menu-item--sub"
                href={`mailto:${SUPPORT_EMAIL}`}
                onClick={() => setOpen(false)}
              >
                <span className="menu-item-icon">
                  <Envelope size={19} weight="regular" />
                </span>
                <span>Email us</span>
              </a>
            </div>
          )}

          {ITEMS.map((item) => (
            <button key={item.id} type="button" role="menuitem" className="menu-item">
              <span className="menu-item-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}

          {hint && <p className="menu-hint">{hint}</p>}
        </div>
      )}
    </div>
  );
}
