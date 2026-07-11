"use client";

// Which Knowledge bases the user has toggled on. Stored locally; a tiny external store so the
// Settings toggles and the chat send-path read one source of truth. The enabled ids are sent to
// /api/chat, which retrieves from each (more active bases = more energy used).

import { useSyncExternalStore } from "react";

const KEY = "ciocu.knowledge.enabled";
const EMPTY: string[] = []; // stable reference for SSR snapshot (avoids a re-render loop)
const listeners = new Set<() => void>();
let current: string[] = load();

function load(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function getEnabledKnowledge(): string[] {
  return current;
}

export function toggleKnowledge(id: string, on: boolean): void {
  const next = on ? [...new Set([...current, id])] : current.filter((x) => x !== id);
  current = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function useEnabledKnowledge(): string[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
    () => EMPTY,
  );
}
