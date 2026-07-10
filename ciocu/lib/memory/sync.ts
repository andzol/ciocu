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

export async function pushToServer(): Promise<void> {
  try {
    const bundle = await serializeMemory();
    await fetch("/api/memory", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bundle),
    });
  } catch {
    /* best-effort */
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
