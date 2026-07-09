// Topic threading: a new memory block joins the topic of its nearest existing block when they're
// similar enough — so mentions of the same thing (a thesis, a relationship, a worry) accrue into
// one growing thread over time. Greedy single-linkage; good enough, and cheap at this scale.

import { cosine } from "@/lib/embeddings/embedder";
import { newId } from "@/lib/memory/store";

// e5 passage<->passage similarity above this reads as "the same ongoing topic".
const SAME_TOPIC = 0.87;

export interface TopicCandidate {
  embedding: Float32Array;
  topicId?: string;
}

export function pickTopicId(
  embedding: Float32Array,
  existing: TopicCandidate[],
): { topicId: string; joined: boolean; sim: number } {
  let bestSim = -1;
  let bestTopic: string | undefined;
  for (const b of existing) {
    if (!b.topicId) continue;
    const s = cosine(embedding, b.embedding);
    if (s > bestSim) {
      bestSim = s;
      bestTopic = b.topicId;
    }
  }
  if (bestSim >= SAME_TOPIC && bestTopic) return { topicId: bestTopic, joined: true, sim: bestSim };
  return { topicId: newId(), joined: false, sim: bestSim };
}
