// Turn a finished exchange into stored memory blocks: ask /api/reflect what's worth keeping, embed
// each locally, and write it with the emotional charge of the moment. Fire-and-forget from the UI.

import { embed } from "@/lib/embeddings/embedder";
import { newId, putBlock, type BlockKind } from "@/lib/memory/store";

interface ReflectMsg {
  role: "user" | "assistant";
  content: string;
}

export async function rememberExchange(
  messages: ReflectMsg[],
  mood: { valence: number; arousal: number },
  threadId: string,
): Promise<number> {
  let items: { content: string; kind: BlockKind }[] = [];
  try {
    const res = await fetch("/api/reflect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
    if (!res.ok) return 0;
    const data = await res.json();
    if (Array.isArray(data?.blocks)) items = data.blocks;
  } catch {
    return 0;
  }
  if (items.length === 0) return 0;

  const vectors = await embed(
    items.map((i) => i.content),
    "passage: ", // e5 passage prefix
  );
  const now = Date.now();
  // Strong feeling => stickier memory (the amygdala trick).
  const salience = Math.min(1, 0.3 + Math.abs(mood.arousal) * 0.5 + Math.abs(mood.valence) * 0.2);

  await Promise.all(
    items.map((it, i) =>
      putBlock({
        id: newId(),
        threadId,
        content: it.content,
        kind: it.kind,
        embedding: vectors[i],
        valence: mood.valence,
        arousal: mood.arousal,
        salience,
        createdAt: now,
        eventTime: now,
        lastRecalledAt: now,
        reinforced: 0,
        status: "active",
      }),
    ),
  );
  return items.length;
}
