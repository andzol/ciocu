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
} from "@phosphor-icons/react";
import { useGoogleUser } from "@/lib/auth/session";
import { CHECKOUT_URL, openCheckout } from "@/lib/billing/checkout";

interface Item {
  id: string;
  label: string;
  icon: React.ReactNode;
}

// Remaining inert item (wired in a later milestone).
const ITEMS: Item[] = [
  { id: "gift", label: "Gift Ciocu", icon: <Gift size={20} weight="regular" /> },
];

export default function HamburgerMenu({ onOpenSettings }: { onOpenSettings: () => void }) {
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [memoryOpen, setMemoryOpen] = useState(false);
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

          {/* Subscribe — gated behind sign-in. */}
          <button type="button" role="menuitem" className="menu-item" onClick={handleSubscribe}>
            <span className="menu-item-icon">
              <Sparkle size={20} weight="regular" />
            </span>
            <span>Subscribe</span>
          </button>

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
