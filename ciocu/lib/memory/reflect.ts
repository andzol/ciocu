// Turn a finished exchange into stored memory blocks: ask /api/reflect what's worth keeping, embed
// each locally, and write it with the emotional charge of the moment. Fire-and-forget from the UI.

import { cosine, embed } from "@/lib/embeddings/embedder";
import { assignCluster, ensureClusters } from "@/lib/memory/clusters";
import { getActiveBlocks, newId, putBlock, type BlockKind } from "@/lib/memory/store";

/** Nearest existing block, for the near-duplicate guard. */
function nearestSim(v: Float32Array, pool: Float32Array[]): number {
  let best = -1;
  for (const p of pool) {
    const s = cosine(v, p);
    if (s > best) best = s;
  }
  return best;
}

interface ReflectMsg {
  role: "user" | "assistant";
  content: string;
}

export async function rememberExchange(
  messages: ReflectMsg[],
  mood: { valence: number; arousal: number },
  threadId: string,
): Promise<number> {
  async function fetchBlocks(): Promise<{ content: string; kind: BlockKind }[]> {
    try {
      const res = await fetch("/api/reflect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data?.blocks) ? data.blocks : [];
    } catch {
      return [];
    }
  }

  // one retry — the extractor occasionally returns nothing on a cold/hiccuped call
  let items = await fetchBlocks();
  if (items.length === 0) items = await fetchBlocks();
  if (items.length === 0) return 0;

  try {
    const vectors = await embed(
      items.map((i) => i.content),
      "passage: ", // e5 passage prefix
    );
    const now = Date.now();
    // Strong feeling => stickier memory (the amygdala trick).
    const salience = Math.min(1, 0.3 + Math.abs(mood.arousal) * 0.5 + Math.abs(mood.valence) * 0.2);

    await ensureClusters(); // first run after the M4c→M4d upgrade re-clusters what's already there

    // The near-duplicate guard compares against individual blocks, not centroids: "have I already
    // stored this exact sentence?" is a different question from "which idea does it belong to".
    const pool: Float32Array[] = (await getActiveBlocks()).map((b) => b.embedding);
    const feeling = { valence: mood.valence, arousal: mood.arousal, salience };

    let stored = 0;
    for (let i = 0; i < items.length; i++) {
      // essentially already remembered — skip it (M5 sleep does the fuller dedup)
      if (nearestSim(vectors[i], pool) > 0.96) continue;
      const { clusterId } = await assignCluster(vectors[i], feeling, now);
      stored++;
      await putBlock({
        id: newId(),
        threadId,
        content: items[i].content,
        kind: items[i].kind,
        embedding: vectors[i],
        valence: mood.valence,
        arousal: mood.arousal,
        salience,
        createdAt: now,
        eventTime: now,
        lastRecalledAt: now,
        reinforced: 0,
        status: "active",
        clusterId,
      });
      pool.push(vectors[i]);
    }
    return stored;
  } catch {
    return 0; // embed/store hiccup — best-effort, never crashes the conversation
  }
}
