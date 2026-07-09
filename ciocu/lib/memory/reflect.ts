// Turn a finished exchange into stored memory blocks: ask /api/reflect what's worth keeping, embed
// each locally, and write it with the emotional charge of the moment. Fire-and-forget from the UI.

import { embed } from "@/lib/embeddings/embedder";
import { getActiveBlocks, newId, putBlock, type BlockKind } from "@/lib/memory/store";
import { pickTopicId, type TopicCandidate } from "@/lib/memory/topics";

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

    // Thread topics: each new block joins the topic of its nearest block (existing or same-batch).
    const pool: TopicCandidate[] = (await getActiveBlocks()).map((b) => ({
      embedding: b.embedding,
      topicId: b.topicId,
    }));

    let stored = 0;
    for (let i = 0; i < items.length; i++) {
      const { topicId, sim } = pickTopicId(vectors[i], pool);
      // essentially already remembered — skip the near-duplicate (M5 sleep does fuller dedup)
      if (sim > 0.96) continue;
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
        topicId,
      });
      pool.push({ embedding: vectors[i], topicId });
    }
    return stored;
  } catch {
    return 0; // embed/store hiccup — best-effort, never crashes the conversation
  }
}
