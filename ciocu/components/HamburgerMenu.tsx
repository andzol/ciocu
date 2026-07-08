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

interface Item {
  id: string;
  label: string;
  icon: React.ReactNode;
}

// M1: menu items are present but inert (wired to real actions in later milestones).
const ITEMS: Item[] = [
  { id: "settings", label: "Settings", icon: <GearSix size={20} weight="regular" /> },
  { id: "download", label: "Download memory", icon: <DownloadSimple size={20} weight="regular" /> },
  { id: "upload", label: "Upload memory", icon: <UploadSimple size={20} weight="regular" /> },
  { id: "plan", label: "Plan", icon: <Sparkle size={20} weight="regular" /> },
  { id: "gift", label: "Gift Ciocu", icon: <Gift size={20} weight="regular" /> },
];

export default function HamburgerMenu() {
  const [open, setOpen] = useState(false);
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
          {ITEMS.map((item) => (
            <button key={item.id} type="button" role="menuitem" className="menu-item">
              <span className="menu-item-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
