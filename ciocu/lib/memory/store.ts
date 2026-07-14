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
  clusterId?: string; // which memory cluster this belongs to (M4d)
  topicId?: string; // legacy M4c single-linkage thread — superseded by clusterId, kept so older
  // exports still import cleanly. Nothing reads it any more.
}

/**
 * A memory cluster — the schema layer (see the ciocu-memory-emotion skill). Not a chain of blocks:
 * a PROTOTYPE (centroid) with an emotional signature, which is why it doesn't drift the way
 * single-linkage threads did.
 *
 * Fully DERIVED from its member blocks, so it's always rebuildable (principle #1) and is
 * deliberately not exported/synced — `ensureClusters()` reconstructs it from blocks instead.
 * The `*Sum` fields are accumulators that keep updates O(1) and exact.
 */
export interface StoredCluster {
  id: string;
  sum: Float32Array; // Σ member embeddings — centroid is exactly normalize(sum)
  centroid: Float32Array; // normalize(sum), cached so scoring is a plain cosine
  size: number;
  simSum: number; // Σ member→centroid similarity at join; radius = simSum / size
  radius: number; // mean similarity to the centroid = how tight/precise this cluster is
  wSum: number; // Σ salience — the weight behind the emotional signature
  vSum: number; // Σ salience·valence
  aSum: number; // Σ salience·arousal
  valence: number; // salience-weighted emotional signature: felt memories define the feel
  arousal: number;
  strength: number; // cluster-level salience; decays and is reinforced at sleep (M5b)
  createdAt: number;
  lastActiveAt: number;
  status: "active" | "archived" | "merged";
  mergedInto?: string;
  gist?: string; // one-line abstraction, written at sleep (M5b)
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
    indexes: { "by-status": string; "by-thread": string; "by-cluster": string };
  };
  clusters: {
    key: string;
    value: StoredCluster;
    indexes: { "by-status": string };
  };
}

let dbPromise: Promise<IDBPDatabase<CiocuDB>> | null = null;

function db() {
  if (!dbPromise) {
    dbPromise = openDB<CiocuDB>("ciocu", 3, {
      upgrade(d, oldVersion, _newVersion, tx) {
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
        if (oldVersion < 3) {
          // M4d: memory clusters. Existing blocks have no clusterId yet — they're re-clustered
          // lazily by ensureClusters(), which also repairs the chained topics the old
          // single-linkage threading produced. Safe: blocks are a derived, rebuildable cache.
          const c = d.createObjectStore("clusters", { keyPath: "id" });
          c.createIndex("by-status", "status");
          tx.objectStore("blocks").createIndex("by-cluster", "clusterId");
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

// ── Memory clusters ────────────────────────────────────────────────────────────
export async function putCluster(cluster: StoredCluster): Promise<void> {
  const d = await db();
  await d.put("clusters", cluster);
}

export async function getActiveClusters(): Promise<StoredCluster[]> {
  const d = await db();
  return d.getAllFromIndex("clusters", "by-status", "active");
}

/** The blocks belonging to one cluster (any status) — used to rebuild a cluster from its members. */
export async function getBlocksByCluster(clusterId: string): Promise<StoredBlock[]> {
  const d = await db();
  return d.getAllFromIndex("blocks", "by-cluster", clusterId);
}

/** Attach blocks to a cluster in one transaction (assignment + backfill). */
export async function setBlockCluster(ids: string[], clusterId: string): Promise<void> {
  if (ids.length === 0) return;
  const d = await db();
  const tx = d.transaction("blocks", "readwrite");
  for (const id of ids) {
    const b = await tx.store.get(id);
    if (!b) continue;
    b.clusterId = clusterId;
    await tx.store.put(b);
  }
  await tx.done;
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

/**
 * Merge records from another device / a backup into this store. Union by id (append-only for
 * messages); for blocks that already exist, keep the stronger/fresher version. Returns how many
 * new records were added. This is the heart of both file-import and cross-device sync.
 */
export async function importRecords(data: {
  threads?: StoredThread[];
  messages?: StoredMessage[];
  blocks?: StoredBlock[];
}): Promise<{ threads: number; messages: number; blocks: number }> {
  const d = await db();
  const added = { threads: 0, messages: 0, blocks: 0 };
  const tx = d.transaction(["threads", "messages", "blocks"], "readwrite");

  for (const m of data.messages ?? []) {
    if (!(await tx.objectStore("messages").get(m.id))) {
      await tx.objectStore("messages").put(m);
      added.messages++;
    }
  }
  for (const t of data.threads ?? []) {
    const existing = await tx.objectStore("threads").get(t.id);
    if (!existing) {
      await tx.objectStore("threads").put(t);
      added.threads++;
    } else if (t.lastAt > existing.lastAt) {
      await tx.objectStore("threads").put({ ...existing, ...t });
    }
  }
  for (const b of data.blocks ?? []) {
    const existing = await tx.objectStore("blocks").get(b.id);
    if (!existing) {
      await tx.objectStore("blocks").put(b);
      added.blocks++;
    } else {
      await tx.objectStore("blocks").put({
        ...existing,
        reinforced: Math.max(existing.reinforced, b.reinforced),
        lastRecalledAt: Math.max(existing.lastRecalledAt, b.lastRecalledAt),
        salience: Math.max(existing.salience, b.salience),
        // a supersede/archive from anywhere wins (contradiction/pruning propagates)
        status: b.status !== "active" ? b.status : existing.status,
      });
    }
  }
  await tx.done;
  return added;
}

/** Full export of the raw log + derived blocks — powers file download and cross-device sync. */
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
