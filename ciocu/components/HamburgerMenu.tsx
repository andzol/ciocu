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
} from "@phosphor-icons/react";
import { useGoogleUser } from "@/lib/auth/session";
import { CHECKOUT_URL, openCheckout } from "@/lib/billing/checkout";

interface Item {
  id: string;
  label: string;
  icon: React.ReactNode;
}

// M1: these remaining menu items are present but inert (wired to real actions in later milestones).
const ITEMS: Item[] = [
  { id: "download", label: "Download memory", icon: <DownloadSimple size={20} weight="regular" /> },
  { id: "upload", label: "Upload memory", icon: <UploadSimple size={20} weight="regular" /> },
  { id: "gift", label: "Gift Ciocu", icon: <Gift size={20} weight="regular" /> },
];

export default function HamburgerMenu({ onOpenSettings }: { onOpenSettings: () => void }) {
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
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

  // Reset any transient hint whenever the menu closes.
  useEffect(() => {
    if (!open) setHint(null);
  }, [open]);

  function handleSubscribe() {
    // Paying requires an identity, so we can attach the payment to a real, verified email.
    if (!user) {
      setHint("Sign in with Google to subscribe.");
      return;
    }
    if (!openCheckout(user.email)) {
      setHint("Checkout isn't configured yet.");
      return;
    }
    setOpen(false);
  }

  function handleSettings() {
    setOpen(false);
    onOpenSettings();
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
