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

// A memory block — derived from the raw log, carrying feeling + time (see ciocu-memory-emotion).
// Rebuildable, so it's always safe to prune/merge these; the raw messages are the truth.
export type BlockKind = "episodic" | "semantic" | "affective";
export interface StoredBlock {
  id: string;
  threadId: string;
  content: string;
  kind: BlockKind;
  embedding: Float32Array; // MiniLM, L2-normalized (384-dim)
  valence: number; // how it felt when formed
  arousal: number;
  salience: number; // strength = f(|arousal|, reinforcement, recency)
  createdAt: number;
  eventTime: number;
  lastRecalledAt: number;
  reinforced: number;
  status: "active" | "archived" | "superseded";
  topicId?: string; // populated in M4c
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
  blocks: {
    key: string;
    value: StoredBlock;
    indexes: { "by-status": string; "by-thread": string };
  };
}

let dbPromise: Promise<IDBPDatabase<CiocuDB>> | null = null;

function db() {
  if (!dbPromise) {
    dbPromise = openDB<CiocuDB>("ciocu", 2, {
      upgrade(d, oldVersion) {
        if (oldVersion < 1) {
          const m = d.createObjectStore("messages", { keyPath: "id" });
          m.createIndex("by-thread", "threadId");
          m.createIndex("by-ts", "ts");
          const t = d.createObjectStore("threads", { keyPath: "id" });
          t.createIndex("by-lastAt", "lastAt");
        }
        if (oldVersion < 2) {
          const b = d.createObjectStore("blocks", { keyPath: "id" });
          b.createIndex("by-status", "status");
          b.createIndex("by-thread", "threadId");
        }
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

// ── Memory blocks ──────────────────────────────────────────────────────────────
export async function putBlock(block: StoredBlock): Promise<void> {
  const d = await db();
  await d.put("blocks", block);
}

export async function getActiveBlocks(): Promise<StoredBlock[]> {
  const d = await db();
  return d.getAllFromIndex("blocks", "by-status", "active");
}

export async function countActiveBlocks(): Promise<number> {
  const d = await db();
  return d.countFromIndex("blocks", "by-status", "active");
}

/** Bump strength + recency on the blocks that were just recalled (spaced-repetition style). */
export async function reinforceBlocks(ids: string[], now: number): Promise<void> {
  if (ids.length === 0) return;
  const d = await db();
  const tx = d.transaction("blocks", "readwrite");
  for (const id of ids) {
    const b = await tx.store.get(id);
    if (!b) continue;
    b.reinforced += 1;
    b.lastRecalledAt = now;
    b.salience = Math.min(1, b.salience + 0.03);
    await tx.store.put(b);
  }
  await tx.done;
}

/** Full export of the raw log — the basis for the future "download memory" feature (M5). */
export async function exportAll(): Promise<{
  threads: StoredThread[];
  messages: StoredMessage[];
  blocks: StoredBlock[];
}> {
  const d = await db();
  return {
    threads: await d.getAll("threads"),
    messages: await d.getAll("messages"),
    blocks: await d.getAll("blocks"),
  };
}
