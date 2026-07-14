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

/** How many of these enabled bases actually cost energy — the support base is free. */
export function billableCount(enabledIds: string[], bases: KnowledgeBase[]): number {
  return enabledIds.filter((id) => !bases.find((b) => b.id === id)?.free).length;
}
