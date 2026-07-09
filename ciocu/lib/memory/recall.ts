// Hybrid recall: given the current query + mood, surface the memory blocks most worth bringing
// back — semantic match, recency (time), salience (felt/important), and mood-congruence. Behind
// this simple interface so an ANN index can replace the brute-force scan later (see the skill).

import { cosine, embedOne } from "@/lib/embeddings/embedder";
import { getActiveBlocks, reinforceBlocks, type StoredBlock } from "@/lib/memory/store";

const HALF_LIFE_DAYS = 21; // recency half-life
// e5 sims cluster in a high, narrow band (and cross-lingual pairs sit a touch lower), so this
// floor is deliberately loose — it hands the model a few candidate memories and lets it judge
// relevance, backed by the "never invent facts" rule in her personality.
const MIN_SIM = 0.74;

export async function recall(
  query: string,
  mood: { valence: number; arousal: number },
  k = 4,
): Promise<StoredBlock[]> {
  const blocks = await getActiveBlocks();
  if (blocks.length === 0) return []; // nothing to embed against yet — stays instant early on

  const qvec = await embedOne(query, "query: "); // e5 query prefix
  const now = Date.now();

  const scored = blocks.map((b) => {
    const sim = cosine(qvec, b.embedding); // 0..1 (vectors are normalized)
    const ageDays = (now - b.lastRecalledAt) / 86_400_000;
    const recency = Math.pow(0.5, ageDays / HALF_LIFE_DAYS); // 1..0
    const moodRes = 1 - Math.abs(mood.valence - b.valence) / 2; // mood-congruent recall, 0..1
    const score = sim + b.salience * 0.35 + recency * 0.2 + moodRes * 0.1;
    return { b, sim, score };
  });

  scored.sort((x, y) => y.score - x.score);
  const top = scored.filter((s) => s.sim > MIN_SIM).slice(0, k);
  if (top.length === 0) return [];

  // Pull the whole thread: bring in other blocks from the same topic(s), so a recurring theme
  // returns with its full arc, not just the single closest sentence.
  const topicIds = new Set(top.map((s) => s.b.topicId).filter(Boolean) as string[]);
  const chosen = new Map<string, StoredBlock>();
  for (const s of top) chosen.set(s.b.id, s.b); // primary matches first
  const siblings = blocks
    .filter((b) => b.topicId && topicIds.has(b.topicId) && !chosen.has(b.id))
    .sort((a, b) => b.salience - a.salience || b.eventTime - a.eventTime);
  for (const b of siblings) {
    if (chosen.size >= 6) break;
    chosen.set(b.id, b);
  }

  const result = [...chosen.values()];
  await reinforceBlocks(result.map((b) => b.id), now); // recalling strengthens the memory
  return result;
}

/** Format recalled blocks as a context note for the model — used naturally, never recited. */
export function formatMemories(blocks: StoredBlock[]): string {
  if (blocks.length === 0) return "";
  const lines = blocks.map((b) => `- ${b.content}`).join("\n");
  return `What you actually remember about them (these are the ONLY personal facts you know — draw on them only if relevant, never recite them as a list, and never invent others):\n${lines}`;
}
