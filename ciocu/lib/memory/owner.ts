"use client";

// Who this device's memory belongs to.
//
// IndexedDB is per-origin, not per-account, and sign-out only ever cleared the cookie and the
// profile. So a conversation stayed on the device with nothing tying it to a person: sign in with a
// second Google account and you were shown the first account's history. On a shared phone that is
// somebody else's therapy session.
//
// Worse in the other direction — had the second account been subscribed, schedulePush would have
// uploaded the first account's conversation into the second account's server bundle. That it didn't
// was only because the free tier gets a 402 from /api/memory. Luck, not design.
//
// So: the local store carries an owner, and changing hands empties it.

import { clearAllMemory } from "@/lib/memory/store";
import { clearBond } from "@/lib/mood/mood";

const OWNER_KEY = "ciocu.memory.owner";

/** Nobody signed in. A real identity is the Google `sub`, which is stable per account. */
export const ANON = "anon";

export type OwnerOutcome =
  /** Same person as last time (or the very first run) — nothing to do. */
  | "kept"
  /** Signed in for the first time on a device used anonymously; that history was theirs. */
  | "adopted"
  /** The device changed hands. Local memory has been erased. */
  | "wiped";

function read(): string | null {
  try {
    return window.localStorage.getItem(OWNER_KEY);
  } catch {
    return null;
  }
}

function write(id: string): void {
  try {
    window.localStorage.setItem(OWNER_KEY, id);
  } catch {
    /* private mode — we simply can't remember the owner, and will re-evaluate next load */
  }
}

/** True if signing out right now would destroy memory that exists nowhere else. */
export function ownsLocalMemory(identity: string | null): boolean {
  return read() === (identity ?? ANON);
}

/**
 * Make the local store belong to `identity`, erasing it first if it belonged to someone else.
 *
 * Signed-out counts as an identity of its own, so logging out clears the device too — otherwise
 * handing someone an unlocked phone shows them the last person's conversation. The one exception is
 * anonymous → signed-in: that history was built by the person who just identified themselves, so it
 * is adopted rather than thrown away.
 */
export async function reconcileOwner(identity: string | null): Promise<OwnerOutcome> {
  const id = identity ?? ANON;
  const owner = read();

  if (owner === null) {
    write(id); // first run on this device — claim it, keep whatever is here
    return "kept";
  }
  if (owner === id) return "kept";
  if (owner === ANON && id !== ANON) {
    write(id);
    return "adopted";
  }

  await clearAllMemory();
  clearBond();
  write(id);
  return "wiped";
}
