// Recall — cluster-first, then spreading activation.
//
// The cue is the question *plus how she feels*: emotion is part of what retrieves a memory, not a
// tiebreak (state-dependent recall). It works in two stages, the way remembering actually seems to:
// a cue first lights up a region of memory, and specific things surface out of it.
//
//   1. Score CLUSTERS against the cue → open only the few that light up. This is also what bounds
//      the search: O(clusters + members of a few) instead of every block ever stored.
//   2. Score the members of those clusters, and let activation SPREAD from the lit cluster to its
//      members — so a memory the cue never touched can still surface if it sits near the heart of
//      something that did. That's how the arc of a recurring theme comes back.
//
// The old version took the top-4 and then bolted on up to 6 same-topic siblings *by rank*, so
// siblings rode along whether or not they were relevant. Here they have to earn it.

import { cosine, embedOne } from "@/lib/embeddings/embedder";
import { ensureClusters } from "@/lib/memory/clusters";
import {
  getActiveBlocks,
  getActiveClusters,
  getBlocksByCluster,
  reinforceBlocks,
  type StoredBlock,
  type StoredCluster,
} from "@/lib/memory/store";

const HALF_LIFE_DAYS = 21; // recency half-life
// e5 sims cluster in a high, narrow band (and cross-lingual pairs sit a touch lower), so this
// floor is deliberately loose — it hands the model a few candidate memories and lets it judge
// relevance, backed by the "never invent facts" rule in her personality.
const MIN_SIM = 0.74;

const TOP_CLUSTERS = 3; // how many regions one cue may light up
// Deliberately permissive. A big, varied cluster has a diluted centroid, so a low floor + opening
// more than one cluster is what stops coarse cluster-first search from hiding a good memory behind
// an average-looking prototype.
const CLUSTER_FLOOR = 0.5;
const SPREAD = 0.35; // γ — how much activation flows from a lit cluster into its members
// A memory earns its slot by getting within reach of the strongest one. Relative, not absolute, so
// it scales with wherever this user's similarities actually sit (see the note on MIN_SIM).
const SIBLING_RATIO = 0.75;
const MAX_RECALL = 6; // context budget

// Cluster ranking: mostly "is this what they're asking about", nudged by feeling, how strong the
// cluster is, and how recently it mattered.
const C_MOOD_W = 0.15;
const C_STRENGTH_W = 0.15;
const C_RECENCY_W = 0.1;

function decay(since: number, now: number): number {
  return Math.pow(0.5, (now - since) / 86_400_000 / HALF_LIFE_DAYS);
}

/** Mood-congruent recall: she reaches for memories that match how she feels right now. */
function moodResonance(mood: { valence: number }, x: { valence: number }): number {
  return 1 - Math.abs(mood.valence - x.valence) / 2;
}

/** The clusters this cue lights up, with how strongly the cue hit each centroid. */
function lightUp(
  qvec: Float32Array,
  clusters: StoredCluster[],
  mood: { valence: number; arousal: number },
  now: number,
): { cluster: StoredCluster; sim: number }[] {
  return clusters
    .map((c) => ({ cluster: c, sim: cosine(qvec, c.centroid) }))
    .filter((x) => x.sim >= CLUSTER_FLOOR)
    .map((x) => ({
      ...x,
      score:
        x.sim +
        moodResonance(mood, x.cluster) * C_MOOD_W +
        x.cluster.strength * C_STRENGTH_W +
        decay(x.cluster.lastActiveAt, now) * C_RECENCY_W,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_CLUSTERS);
}

export async function recall(
  query: string,
  mood: { valence: number; arousal: number },
  maxBlocks = MAX_RECALL,
): Promise<StoredBlock[]> {
  await ensureClusters(); // memoized; only works right after the M4c→M4d upgrade or an import
  const clusters = await getActiveClusters();
  const qvec = await embedOne(query, "query: "); // e5 query prefix
  const now = Date.now();

  // Which memories are even in play, and how hot is the region each one sits in.
  const activation = new Map<string, number>(); // clusterId → how hard the cue hit its centroid
  const centroids = new Map<string, Float32Array>();
  let candidates: StoredBlock[];

  if (clusters.length > 0) {
    const lit = lightUp(qvec, clusters, mood, now);
    if (lit.length === 0) return []; // nothing in memory is near this — don't dredge
    for (const l of lit) {
      activation.set(l.cluster.id, l.sim);
      centroids.set(l.cluster.id, l.cluster.centroid);
    }
    const lists = await Promise.all(lit.map((l) => getBlocksByCluster(l.cluster.id)));
    candidates = lists.flat().filter((b) => b.status === "active");
  } else {
    // No clusters (empty memory, or ensureClusters degraded) — fall back to a flat scan rather
    // than silently remembering nothing.
    candidates = await getActiveBlocks();
  }
  if (candidates.length === 0) return [];

  const scored = candidates.map((b) => {
    const direct = cosine(qvec, b.embedding); // did the cue hit this memory itself?
    const hot = b.clusterId ? (activation.get(b.clusterId) ?? 0) : 0;
    const centroid = b.clusterId ? centroids.get(b.clusterId) : undefined;
    // Spreading activation: a memory the cue never touched still surfaces if its region is lit and
    // it sits near the heart of it — attenuated by both, so it can't ride along for free.
    const spread = centroid ? SPREAD * hot * cosine(b.embedding, centroid) : 0;
    const score =
      direct +
      spread +
      b.salience * 0.35 + // felt/important memories surface more easily (the amygdala trick)
      decay(b.lastRecalledAt, now) * 0.2 +
      moodResonance(mood, b) * 0.1;
    return { b, direct, score };
  });

  // Nothing actually answers the question — say nothing rather than offer something random.
  if (!scored.some((s) => s.direct > MIN_SIM)) return [];

  scored.sort((x, y) => y.score - x.score);
  const best = scored[0].score;
  const chosen = scored.filter((s) => s.score >= best * SIBLING_RATIO).slice(0, maxBlocks);

  const result = chosen.map((s) => s.b);
  await reinforceBlocks(
    result.map((b) => b.id),
    now,
  ); // recalling strengthens the memory — and, at sleep, its cluster
  return result;
}

/** Format recalled blocks as a context note for the model — used naturally, never recited. */
export function formatMemories(blocks: StoredBlock[]): string {
  if (blocks.length === 0) return "";
  const lines = blocks.map((b) => `- ${b.content}`).join("\n");
  return `What you actually remember about them (these are the ONLY personal facts you know — draw on them only if relevant, never recite them as a list, and never invent others):\n${lines}`;
}
