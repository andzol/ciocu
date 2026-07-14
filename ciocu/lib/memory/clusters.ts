// Memory clusters — assignment against a PROTOTYPE, not a chain.
//
// Why this replaces M4c's topic threading: single-linkage joined a block to whichever *single*
// block it was nearest, and that chains. A~B at 0.88 and B~C at 0.88 put A and C in one "topic"
// even when A·C is 0.55 — and recall then dragged the whole contaminated thread back. Scoring
// against a cluster's centroid (its centre of mass) removes the chain: a memory has to belong to
// the whole idea, not to one straggler on its edge.
//
// Emotion is first-class here, but it MODULATES rather than binds: meaning decides what a cluster
// IS, feeling only adjusts membership at the margin. Two unrelated memories that merely share a
// mood must never merge — "everything sad in one bucket" isn't how people remember.

import { cosine } from "@/lib/embeddings/embedder";
import {
  getActiveBlocks,
  getActiveClusters,
  newId,
  putCluster,
  setBlockCluster,
  type StoredBlock,
  type StoredCluster,
} from "@/lib/memory/store";

// e5 similarities sit in a high, narrow band (roughly 0.74 noise floor → 0.96 near-duplicate), so
// these thresholds live close together. They're explicit constants for now; M5b (sleep) is where
// they get calibrated per-user from the observed distribution — that's what finally retires the
// magic numbers, and it matters because cross-lingual pairs score lower than same-language ones.
const SEMANTIC_FLOOR = 0.82; // below this, feeling can't rescue it — it's a different subject
const BASE_JOIN = 0.85; // affinity needed to join a loose cluster
const TIGHTNESS_W = 0.04; // a tight cluster is a precise idea → demand a closer match
const DISTINCT_W = 0.04; // Von Restorff: a vivid memory resists being filed under something bland
const EMOTION_W = 0.08; // λ — how far congruent/dissonant feeling can move the semantic match

/** How a memory felt when it formed — the emotional half of what binds it to a cluster. */
export interface Feeling {
  valence: number; // -1..1
  arousal: number; // 0..1
  salience: number; // 0..1
}

export function feelingOf(b: StoredBlock): Feeling {
  return { valence: b.valence, arousal: b.arousal, salience: b.salience };
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** L2-normalize, so `cosine` (a bare dot product) is valid against the result. */
function normalize(v: Float32Array): Float32Array {
  let n = 0;
  for (let i = 0; i < v.length; i++) n += v[i] * v[i];
  n = Math.sqrt(n) || 1;
  const out = new Float32Array(v.length);
  for (let i = 0; i < v.length; i++) out[i] = v[i] / n;
  return out;
}

/**
 * How alike two feelings are, 0..1. Valence dominates: warm-vs-bleak separates memories far more
 * than loud-vs-quiet does.
 */
function emotionalCongruence(f: Feeling, c: StoredCluster): number {
  const dv = Math.abs(f.valence - c.valence) / 2; // valence spans -1..1
  const da = Math.abs(f.arousal - c.arousal); // arousal spans 0..1
  return 1 - clamp01(dv * 0.7 + da * 0.3);
}

/** Semantic match, nudged ±EMOTION_W by whether the feeling fits the cluster's mood. */
function affinity(sim: number, f: Feeling, c: StoredCluster): number {
  const swing = (emotionalCongruence(f, c) * 2 - 1) * EMOTION_W; // congruence 0..1 → -λ..+λ
  return sim * (1 + swing);
}

/**
 * How close a memory must be to join. Two adjustments, both deliberate:
 *  - tight clusters are precise ideas, so they demand a closer match than broad themes;
 *  - intense memories resist absorption, so the night something broke doesn't get quietly filed
 *    under "work chat" — it stays its own vivid thing.
 */
function joinThreshold(c: StoredCluster, f: Feeling): number {
  const tightness = clamp01((c.radius - 0.85) / 0.15);
  return BASE_JOIN + TIGHTNESS_W * tightness + DISTINCT_W * clamp01(f.arousal);
}

function newCluster(embedding: Float32Array, f: Feeling, now: number): StoredCluster {
  const sum = Float32Array.from(embedding);
  return {
    id: newId(),
    sum,
    centroid: normalize(sum),
    size: 1,
    simSum: 1, // a lone member sits exactly on its own centroid
    radius: 1,
    wSum: f.salience,
    vSum: f.salience * f.valence,
    aSum: f.salience * f.arousal,
    valence: f.valence,
    arousal: f.arousal,
    strength: f.salience,
    createdAt: now,
    lastActiveAt: now,
    status: "active",
  };
}

/** Fold a new member in. Exact and O(1): the accumulators carry everything we need. */
function addMember(
  c: StoredCluster,
  embedding: Float32Array,
  f: Feeling,
  sim: number,
  now: number,
): StoredCluster {
  const sum = new Float32Array(c.sum.length);
  for (let i = 0; i < sum.length; i++) sum[i] = c.sum[i] + embedding[i];
  const size = c.size + 1;
  const simSum = c.simSum + sim;
  const wSum = c.wSum + f.salience;
  const vSum = c.vSum + f.salience * f.valence;
  const aSum = c.aSum + f.salience * f.arousal;
  const w = wSum || 1;
  return {
    ...c,
    sum,
    centroid: normalize(sum), // normalize(Σ) is exactly the normalized mean — the 1/n drops out
    size,
    simSum,
    radius: simSum / size, // approximate (the centroid moves); sleep recomputes it exactly
    wSum,
    vSum,
    aSum,
    valence: vSum / w, // felt memories weigh more in what a cluster feels like
    arousal: aSum / w,
    strength: Math.min(1, Math.max(c.strength, f.salience)),
    lastActiveAt: now,
  };
}

/** Recompute a cluster wholly from its members — clusters are derived, so this is always safe. */
function rebuildFrom(id: string, members: StoredBlock[]): StoredCluster {
  const dim = members[0].embedding.length;
  const sum = new Float32Array(dim);
  let wSum = 0;
  let vSum = 0;
  let aSum = 0;
  let strength = 0;
  let createdAt = Number.POSITIVE_INFINITY;
  let lastActiveAt = 0;
  for (const m of members) {
    for (let i = 0; i < dim; i++) sum[i] += m.embedding[i];
    wSum += m.salience;
    vSum += m.salience * m.valence;
    aSum += m.salience * m.arousal;
    strength = Math.max(strength, m.salience);
    createdAt = Math.min(createdAt, m.createdAt);
    lastActiveAt = Math.max(lastActiveAt, m.lastRecalledAt || m.eventTime);
  }
  const centroid = normalize(sum);
  let simSum = 0;
  for (const m of members) simSum += cosine(m.embedding, centroid);
  const w = wSum || 1;
  return {
    id,
    sum,
    centroid,
    size: members.length,
    simSum,
    radius: simSum / members.length,
    wSum,
    vSum,
    aSum,
    valence: vSum / w,
    arousal: aSum / w,
    strength,
    createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
    lastActiveAt,
    status: "active",
  };
}

/**
 * Which cluster a memory belongs to — or null to start a fresh one. Pure, so the batch passes
 * (migration now, sleep later) can run the whole thing in memory instead of hitting the DB per
 * block.
 */
function pickCluster(
  embedding: Float32Array,
  f: Feeling,
  clusters: StoredCluster[],
): { best: StoredCluster | null; sim: number; affinity: number } {
  let best: StoredCluster | null = null;
  let bestAffinity = -1;
  let bestSim = 0;

  for (const c of clusters) {
    const sim = cosine(embedding, c.centroid);
    if (sim < SEMANTIC_FLOOR) continue; // meaning gate — feeling doesn't get a vote down here
    const a = affinity(sim, f, c);
    if (a > bestAffinity) {
      bestAffinity = a;
      best = c;
      bestSim = sim;
    }
  }
  if (best && bestAffinity >= joinThreshold(best, f)) {
    return { best, sim: bestSim, affinity: bestAffinity };
  }
  return { best: null, sim: bestSim, affinity: bestAffinity };
}

/**
 * Place a memory: join the cluster it belongs to, or start a new one. Persists the cluster.
 * Returns the affinity so callers can log/tune.
 */
export async function assignCluster(
  embedding: Float32Array,
  f: Feeling,
  now = Date.now(),
): Promise<{ clusterId: string; joined: boolean; affinity: number }> {
  const clusters = await getActiveClusters();
  const { best, sim, affinity: aff } = pickCluster(embedding, f, clusters);
  if (best) {
    await putCluster(addMember(best, embedding, f, sim, now));
    return { clusterId: best.id, joined: true, affinity: aff };
  }
  const fresh = newCluster(embedding, f, now);
  await putCluster(fresh);
  return { clusterId: fresh.id, joined: false, affinity: aff };
}

// Once per session: migrate/repair. Memoized so the cost lands on the first caller only.
let ensured: Promise<void> | null = null;

/**
 * Make sure every active block sits in a cluster that exists. Handles both:
 *  - **migration** from M4c threads: blocks have no clusterId, so they're re-clustered from
 *    scratch, oldest first. Old topicIds are ignored on purpose — that's what repairs the chained
 *    threads single-linkage produced.
 *  - **import/sync**: blocks arrive referencing clusters this device has never seen (clusters are
 *    derived, so they're deliberately not in the bundle) → rebuild them from their members.
 *
 * Idempotent, and a no-op once everything is assigned.
 */
export function ensureClusters(): Promise<void> {
  if (!ensured) ensured = runEnsure();
  return ensured;
}

async function runEnsure(): Promise<void> {
  try {
    const blocks = await getActiveBlocks();
    if (blocks.length === 0) return;
    const known = new Set((await getActiveClusters()).map((c) => c.id));

    // Rebuild clusters referenced by blocks but missing here (imported memory).
    const orphans = new Map<string, StoredBlock[]>();
    for (const b of blocks) {
      if (!b.clusterId || known.has(b.clusterId)) continue;
      const list = orphans.get(b.clusterId);
      if (list) list.push(b);
      else orphans.set(b.clusterId, [b]);
    }
    for (const [id, members] of orphans) await putCluster(rebuildFrom(id, members));

    // Re-cluster anything still loose, in the order it was actually lived.
    const loose = blocks.filter((b) => !b.clusterId).sort((a, b) => a.eventTime - b.eventTime);
    if (loose.length === 0) return;

    // Batched on purpose: assignCluster() re-reads every cluster from IndexedDB, and each carries
    // two 384-float arrays — per block that turns a migration into hundreds of round-trips, right
    // in front of a user waiting on their first reply. Hold the clusters in memory for the pass and
    // write once at the end.
    const working = await getActiveClusters();
    const touched = new Set<string>();
    const assignments = new Map<string, string[]>(); // clusterId → blockIds

    for (const b of loose) {
      const f = feelingOf(b);
      const { best, sim } = pickCluster(b.embedding, f, working);
      let id: string;
      if (best) {
        working[working.indexOf(best)] = addMember(best, b.embedding, f, sim, b.eventTime);
        id = best.id;
      } else {
        const fresh = newCluster(b.embedding, f, b.eventTime);
        working.push(fresh);
        id = fresh.id;
      }
      touched.add(id);
      const list = assignments.get(id);
      if (list) list.push(b.id);
      else assignments.set(id, [b.id]);
    }

    for (const c of working) if (touched.has(c.id)) await putCluster(c);
    for (const [clusterId, ids] of assignments) await setBlockCluster(ids, clusterId);
  } catch {
    // Best-effort: degrade to unclustered recall rather than break the conversation.
  }
}
