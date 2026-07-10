// Server-safe pure merge of two memory bundles (union records by id). No browser/IndexedDB — the
// /api/memory route uses this to union a device's push with what's already stored, so concurrent
// devices never clobber each other. Embeddings stay as base64 strings; we never decode them here.

interface Thread {
  id: string;
  startedAt: number;
  lastAt: number;
  title?: string;
}
interface Message {
  id: string;
  ts: number;
}
interface Block {
  id: string;
  reinforced: number;
  lastRecalledAt: number;
  salience: number;
  status: string;
}

export interface RawBundle {
  app: "ciocu";
  bundleVersion: number;
  exportedAt: number;
  bond: number;
  threads: Thread[];
  messages: Message[];
  blocks: Block[];
}

function indexById<T extends { id: string }>(rows: T[]): Map<string, T> {
  const m = new Map<string, T>();
  for (const r of rows ?? []) m.set(r.id, r);
  return m;
}

export function mergeBundles(base: RawBundle | null, inc: RawBundle): RawBundle {
  if (!base) return inc;

  // messages: append-only union
  const messages = indexById(base.messages);
  for (const m of inc.messages ?? []) if (!messages.has(m.id)) messages.set(m.id, m);

  // threads: union, newest lastAt wins
  const threads = indexById(base.threads);
  for (const t of inc.threads ?? []) {
    const cur = threads.get(t.id);
    if (!cur || t.lastAt > cur.lastAt) threads.set(t.id, cur ? { ...cur, ...t } : t);
  }

  // blocks: union; keep the stronger/fresher on conflict, and let supersede/archive win
  const blocks = indexById(base.blocks);
  for (const b of inc.blocks ?? []) {
    const cur = blocks.get(b.id);
    if (!cur) {
      blocks.set(b.id, b);
    } else {
      blocks.set(b.id, {
        ...cur,
        ...b,
        reinforced: Math.max(cur.reinforced, b.reinforced),
        lastRecalledAt: Math.max(cur.lastRecalledAt, b.lastRecalledAt),
        salience: Math.max(cur.salience, b.salience),
        status: b.status !== "active" ? b.status : cur.status,
      });
    }
  }

  return {
    app: "ciocu",
    bundleVersion: Math.max(base.bundleVersion, inc.bundleVersion),
    exportedAt: Date.now(),
    bond: Math.max(base.bond ?? 0, inc.bond ?? 0),
    threads: [...threads.values()],
    messages: [...messages.values()],
    blocks: [...blocks.values()],
  };
}
