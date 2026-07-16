"use client";

// The available Knowledge bases, fetched once from /api/knowledge and cached for the session, so
// the Settings toggles, the menu's Support shortcut, and the send-path metering all read one
// source of truth (and don't each re-fetch the list).

export interface KnowledgeBase {
  id: string;
  title: string;
  name: string; // raw pipeline slug, e.g. "ciocu-support"
  adult?: boolean; // frank adult material — shown as an 18+ mark, see /terms §8
  free?: boolean; // never costs energy (support)
}

/** The support base — Ciocu's own documentation. Enabled by the menu's Support shortcut. */
export const SUPPORT_BASE_SLUG = "ciocu-support";

let cache: KnowledgeBase[] | null = null;
let inflight: Promise<KnowledgeBase[]> | null = null;

/** Load the base list (cached; concurrent callers share one request). */
export function loadBases(): Promise<KnowledgeBase[]> {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = fetch("/api/knowledge")
      .then((r) => (r.ok ? r.json() : { bases: [] }))
      .then((d) => {
        const list: KnowledgeBase[] = Array.isArray(d?.bases) ? d.bases : [];
        cache = list;
        return list;
      })
      .catch(() => {
        const empty: KnowledgeBase[] = [];
        cache = empty; // don't hammer a failing endpoint; Settings shows "none available"
        return empty;
      });
  }
  return inflight;
}

/** The base whose material is Ciocu's own support docs, if it exists. */
export function findSupportBase(bases: KnowledgeBase[]): KnowledgeBase | undefined {
  return bases.find((b) => b.name === SUPPORT_BASE_SLUG);
}

/**
 * How many of these enabled bases actually cost energy — the support base is free.
 *
 * An id that isn't in `bases` is charged for NOTHING: it's a base the server withheld (or dropped),
 * so /api/chat won't retrieve from it. Stale ids linger in localStorage after a base is hidden, and
 * the old `!find(...)?.free` read them as unknown⇒billable — energy for a reply that never consulted
 * anything.
 */
export function billableCount(enabledIds: string[], bases: KnowledgeBase[]): number {
  return enabledIds.filter((id) => {
    const base = bases.find((b) => b.id === id);
    return base !== undefined && !base.free;
  }).length;
}
