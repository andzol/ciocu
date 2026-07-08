// Ciocu's memory — the raw conversation log, persisted locally in IndexedDB. This is the
// append-only TRUTH of what was actually said (research: bubbles are a derived cache built on
// top of this in later milestones). Fully on-device; the user owns it.

import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export type Role = "user" | "ciocu";

export interface StoredMessage {
  id: string;
  threadId: string;
  role: Role;
  text: string;
  ts: number;
}

export interface StoredThread {
  id: string;
  startedAt: number;
  lastAt: number;
  title?: string;
}

interface CiocuDB extends DBSchema {
  messages: {
    key: string;
    value: StoredMessage;
    indexes: { "by-thread": string; "by-ts": number };
  };
  threads: {
    key: string;
    value: StoredThread;
    indexes: { "by-lastAt": number };
  };
}

let dbPromise: Promise<IDBPDatabase<CiocuDB>> | null = null;

function db() {
  if (!dbPromise) {
    dbPromise = openDB<CiocuDB>("ciocu", 1, {
      upgrade(d) {
        const m = d.createObjectStore("messages", { keyPath: "id" });
        m.createIndex("by-thread", "threadId");
        m.createIndex("by-ts", "ts");
        const t = d.createObjectStore("threads", { keyPath: "id" });
        t.createIndex("by-lastAt", "lastAt");
      },
    });
  }
  return dbPromise;
}

export function newId(): string {
  return (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
}

/** Append one message and keep its thread's lastAt current (creating the thread if new). */
export async function appendMessage(msg: StoredMessage): Promise<void> {
  const d = await db();
  const tx = d.transaction(["messages", "threads"], "readwrite");
  await tx.objectStore("messages").put(msg);
  const threads = tx.objectStore("threads");
  const existing = await threads.get(msg.threadId);
  if (existing) {
    existing.lastAt = msg.ts;
    await threads.put(existing);
  } else {
    await threads.put({ id: msg.threadId, startedAt: msg.ts, lastAt: msg.ts });
  }
  await tx.done;
}

export async function getThreadMessages(threadId: string): Promise<StoredMessage[]> {
  const d = await db();
  const all = await d.getAllFromIndex("messages", "by-thread", threadId);
  return all.sort((a, b) => a.ts - b.ts);
}

/** The most recently active thread, or null if memory is empty. */
export async function getLatestThreadId(): Promise<string | null> {
  const d = await db();
  const threads = await d.getAllFromIndex("threads", "by-lastAt");
  return threads.length ? threads[threads.length - 1].id : null;
}

/** Full export of the raw log — the basis for the future "download memory" feature (M5). */
export async function exportAll(): Promise<{ threads: StoredThread[]; messages: StoredMessage[] }> {
  const d = await db();
  return {
    threads: await d.getAll("threads"),
    messages: await d.getAll("messages"),
  };
}
