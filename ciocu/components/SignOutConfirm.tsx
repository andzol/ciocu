"use client";

// Signing out now clears this device's memory (see lib/memory/owner.ts) — because leaving one
// person's conversation on a phone for whoever picks it up next is exactly the bug this fixes.
//
// That makes sign-out destructive for anyone without a synced copy, so it asks first and offers the
// export on the way out. "Your memory is yours — to keep, export, and take with you" is one of her
// stated values; deleting it silently would make that a lie.

import { useCallback, useEffect, useState } from "react";
import { SignOut, Warning } from "@phosphor-icons/react";
import { setProfile } from "@/lib/auth/session";
import { useUsage } from "@/lib/usage/ledger";

/** Dispatched by any sign-out control instead of signing out directly. */
export const SIGN_OUT_REQUEST_EVENT = "ciocu:sign-out-request";

export default function SignOutConfirm() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const usage = useUsage();
  // Free plans never reach /api/memory, so the only copy is the one on this device.
  const synced = Boolean(usage && usage.tier !== "none");

  useEffect(() => {
    const ask = () => setOpen(true);
    window.addEventListener(SIGN_OUT_REQUEST_EVENT, ask);
    return () => window.removeEventListener(SIGN_OUT_REQUEST_EVENT, ask);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const signOut = useCallback(() => {
    void fetch("/api/auth", { method: "DELETE" }); // clear the server session cookie
    setProfile(null); // the identity effect in page.tsx then clears this device
    setOpen(false);
  }, []);

  const downloadThenSignOut = useCallback(async () => {
    setBusy(true);
    try {
      const { serializeMemory } = await import("@/lib/memory/bundle");
      const bundle = await serializeMemory();
      const url = URL.createObjectURL(new Blob([JSON.stringify(bundle)], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `ciocu-memory-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* if the export fails we still shouldn't trap them in the dialog */
    } finally {
      setBusy(false);
      signOut();
    }
  }, [signOut]);

  if (!open) return null;

  return (
    <div className="import-backdrop" role="dialog" aria-modal="true" aria-label="Sign out">
      <div className="import-card">
        <h2 className={`import-title${synced ? "" : " import-title--warn"}`}>
          {synced ? <SignOut size={20} weight="regular" /> : <Warning size={20} weight="regular" />}{" "}
          Sign out?
        </h2>
        <p className="import-note">
          {synced
            ? `Her memory of your conversations will be cleared from this device, so nobody else who
               picks it up can read them. Your synced copy is safe and comes back when you sign in.`
                .replace(/\s+/g, " ")
            : `Her memory of your conversations will be cleared from this device — and on the free
               plan there is no synced copy, so this is the only one. Download it first if you want
               to keep it.`.replace(/\s+/g, " ")}
        </p>
        <div className="import-actions">
          <button
            type="button"
            className="import-btn import-btn--quiet"
            onClick={() => setOpen(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`import-btn ${synced ? "import-btn--danger" : "import-btn--primary"}`}
            onClick={downloadThenSignOut}
            disabled={busy}
          >
            {busy ? "Preparing…" : "Download & sign out"}
          </button>
          <button
            type="button"
            className={`import-btn ${synced ? "import-btn--primary" : "import-btn--danger"}`}
            onClick={signOut}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
