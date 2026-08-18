// Client-side cross-device sync. Pull-merges the server bundle into local IndexedDB, and pushes
// local changes back (debounced). All best-effort: if the user isn't signed in / subscribed / the
// store isn't configured, the API refuses and we simply stay local-only. Server-side union means a
// push never clobbers another device's data.

import { mergeBundle, serializeMemory, type MemoryBundle } from "@/lib/memory/bundle";

/** Pull the server's bundle and merge it into local memory. Returns true if anything merged. */
export async function pullFromServer(): Promise<boolean> {
  try {
    const res = await fetch("/api/memory", { method: "GET" });
    if (!res.ok) return false; // 401/402/503 → not eligible; stay local
    const { bundle } = await res.json();
    if (!bundle || bundle.app !== "ciocu") return false;
    await mergeBundle(bundle as MemoryBundle);
    return true;
  } catch {
    return false;
  }
}

/**
 * "ok" — the server holds our push. "skipped" — we aren't eligible (signed out, free tier, sync
 * unconfigured), which is a normal state, not a fault. "failed" — we ARE eligible and it didn't
 * land.
 *
 * The caller only needs the difference after a *replace*: a replace that failed while sync is live
 * means the server still has what the user asked to forget, and the next load will pull it back.
 * That's worth saying out loud rather than pretending the deletion stuck.
 */
export type PushResult = "ok" | "skipped" | "failed";

export async function pushToServer(mode: "merge" | "replace" = "merge"): Promise<PushResult> {
  try {
    const bundle = await serializeMemory();
    const res = await fetch(`/api/memory${mode === "replace" ? "?mode=replace" : ""}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bundle),
    });
    if (res.ok) return "ok";
    // 401 not signed in · 402 not subscribed · 503 store not provisioned — all "stay local".
    return res.status === 401 || res.status === 402 || res.status === 503 ? "skipped" : "failed";
  } catch {
    return "failed";
  }
}

let pushTimer: ReturnType<typeof setTimeout> | null = null;

/** Debounced push — coalesces a burst of memory writes into one upload. */
export function schedulePush(delayMs = 8000): void {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void pushToServer();
  }, delayMs);
}
