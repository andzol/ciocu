---
name: ciocu-memory-emotion
description: >-
  The build spec for Ciocu's coupled memory + emotion system — her mood/mental state
  (valence/arousal/bond) wired to her eyes, emotionally-charged memory blocks that strengthen with
  feeling and gather into clusters around a prototype, cluster-first recall with spreading
  activation, and sleep-based reconciliation. USE THIS
  whenever working on Ciocu's memory, recall, moods, emotions, "mental state", eye expression tied
  to feeling, memory blocks/bubbles, clusters, embeddings, the sleep/reconciliation cycle, or memory
  export/import — even if the request only mentions one piece (e.g. "make her react to how I feel",
  "she should remember past chats", "why isn't she recalling X"). Read it before designing or
  changing any of these so the pieces stay coherent.
---

# Ciocu — Memory + Emotion build spec

Ciocu is an empathic companion whose face is two expressive eyes. **Emotion is the spine** that
ties everything together: her mood drives the eyes, feeling makes memories strong, and mood shapes
what she recalls. Build the pieces so they reinforce that, not as isolated features.

Existing foundation (already built): the eye engine (`ciocu/lib/eyes/`) with `setState`/
`setVoiceLevel`/`setMood`/`setGaze`/`setEmpathy`; the raw conversation log + blocks + clusters in
IndexedDB (`ciocu/lib/memory/store.ts`, DB `ciocu` v3); the LLM proxy (`ciocu/app/api/chat`) using
OpenRouter `deepseek/deepseek-v4-flash`; attention/gaze (`ciocu/lib/attention/`). Embeddings are
on-device transformers.js **multilingual-e5-small** (`ciocu/lib/embeddings/`), in a Web Worker, with
`"query: "`/`"passage: "` prefixes — **not** MiniLM, which was tried and rejected for scoring
question↔statement pairs far too low (~0.17). e5 buys cross-lingual recall (Hungarian query → English
memory) but its similarities sit in a **high, narrow band** (~0.74 noise floor → 0.96 near-duplicate),
which is why every threshold below looks suspiciously close together. Cross-lingual pairs score a
touch lower than same-language ones — assume it when picking any cutoff.

## The three interlocking systems

```
        ┌──────────── MOOD (mental state) ────────────┐
        │  valence · arousal · bond                    │
        │  absorbs your feeling (dog↔owner)            │
        └──────┬───────────────────────────┬──────────┘
               │ drives continuously         │ tags what's
               ▼                             ▼ worth keeping
         THE EYES                      MEMORY BLOCKS
     (emotion layer =            (content + embedding + TIME
      resting expression)         + emotional charge → salience)
                                             │ gather around a prototype
                                             ▼
                                       CLUSTERS
                                (centroid + emotional signature)
               ▲                             │
               │ mood-congruent recall       │ RECALL (cluster-first,
               └─────── surfaces ────────────┘  then spreading activation)
                        ▲
                        │ nightly
                   SLEEP reconciles: re-cluster (split/merge) · strengthen
                   the felt ones · let flat/irrelevant ones fade
```

## Non-negotiable principles

1. **Raw log = append-only TRUTH. Blocks = derived, rebuildable cache.** Never let a derived block
   be the sole copy of anything. If extraction/reconciliation goes wrong, blocks can be rebuilt
   from the raw log. This is what makes the system safe to iterate on and safe at scale.
2. **Never delete, only supersede/archive.** Contradictions version (old → `superseded`); pruned
   blocks → `archived`, not erased. Export always contains everything. The user owns their memory.
3. **Emotion is a first-class dimension**, not metadata. It drives eyes, memory strength, and
   recall. If a change touches memory but ignores feeling, it's probably wrong for Ciocu.
4. **Two-tier memory:** working memory = recent raw messages, always in context (same-session
   continuity). Long-term = consolidated blocks, retrieved on demand (cross-session recall).

## 1. Mood — mental state wired to the eyes

State (persisted per user, updated each exchange, eased toward baseline every frame):
- `valence` −1..+1 (low ↔ warm), `arousal` 0..1 (calm ↔ lit-up), `bond` 0..1 (grows slowly).

**Emotional mirroring — the dog↔owner rule.** She *responds* to your feeling as a companion; she
does not copy it. The pull scales with `bond` (more attached ⇒ feels with you more).

| You seem… | Ciocu moves toward… |
|---|---|
| happy / warm | shared joy (valence ↑, arousal ↑) |
| sad / down | tenderness & concern (valence dips into *caring*, not sad-at-you; arousal gentle) |
| anxious / agitated | calm-attentive, soothing (arousal *down*, steady) — she grounds you |
| angry | soft, non-defensive concern (never mirrors hostility) |
| neutral | eases toward baseline |

**Mood → eyes** (this becomes the engine's continuous *emotion layer*; presence like `listening`
and one-shot reactions like `nod` compose on top via the existing two-layer model):

| Dimension | Eye effect |
|---|---|
| valence + | smile-crescent (botBend −), warmer hue, softer glow |
| valence − | gentle downward tilt, cooler/desaturated, soft |
| arousal + | wider open, larger pupil, brighter glow, quicker blink |
| arousal − | sleepy, dim, slow blink |
| bond | subtle steady warmth in the resting face; seeks eye contact |

Engine API to add: `setMood(valence, arousal)` — a continuous baseline distinct from `setState`.
It biases the eased target each frame; discrete states remain spikes on top.

**Locked defaults:** mood is **transient** (eases to baseline within/after a session); only `bond`
and memories persist, so continuity comes from *memory*, not from a stuck mood. Bond nudges the
resting baseline subtly over time.

## 2. Memory block

```ts
Block {
  id, content, embedding: Float32Array,
  eventTime, createdAt, lastRecalledAt,       // TIME is first-class
  valence, arousal,                           // how it felt when formed
  salience,          // strength = f(|arousal| at formation, reinforced, recency)
  reinforced,        // ++ on each recall
  clusterId,         // which prototype it gathered around (§4)
  topicId?,          // LEGACY (M4c). Read only, to import old bundles — never write it.
  status: 'active' | 'archived' | 'superseded',
  supersedes?, sourceMsgIds[]                 // provenance → raw truth
}
```

**Strong feeling ⇒ strong memory.** High `|arousal|` at formation tags a block as *key*: high
salience, resists decay, surfaces easily later (the amygdala trick). This is the heart of "key
memories where strong feelings emerge."

## 3. Recall — cluster-first, then spreading activation

`lib/memory/recall.ts`. The cue is **the question plus how she feels** — emotion retrieves, it isn't
a tiebreak (state-dependent recall). Two stages, the way remembering actually seems to work: a cue
lights up a *region*, and specifics surface out of it.

**Stage 1 — light up clusters.** Score every cluster centroid against the cue; keep the top
`TOP_CLUSTERS` (3) above `CLUSTER_FLOOR` (0.5). This is also what bounds the search: O(clusters +
members of a few) instead of every block ever stored.
```
clusterScore = cosine(cue, centroid)
             + moodResonance · 0.15 + strength · 0.15 + recency · 0.10
```
`CLUSTER_FLOOR` is deliberately *permissive*, and >1 cluster opens on purpose: a big varied cluster
has a diluted centroid, so a strict floor would hide a good memory behind an average-looking
prototype. If nothing lights up, **return nothing** — don't dredge.

**Stage 2 — score members, and let activation spread.**
```
score = direct                       // cosine(cue, block) — did the cue hit this memory itself?
      + SPREAD(0.35) · hot · cosine(block, centroid)   // ← spreading activation
      + salience · 0.35              // felt memories surface more easily (the amygdala trick)
      + recency(lastRecalledAt) · 0.20
      + moodResonance · 0.10
```
`hot` = how hard the cue hit that cluster's centroid. **Spreading activation is the point**: a memory
the cue never touched still surfaces if its region is lit *and* it sits near the heart of it —
attenuated by both, so nothing rides along for free. That's how the arc of a recurring theme comes
back. Contrast M4c, which bolted on up to 6 same-topic siblings **by rank**, relevant or not.

**Two gates that prefer silence over noise.** (1) If no block clears `MIN_SIM` (0.74) on *direct*
similarity, return `[]` — nothing actually answers the question. (2) Survivors must score within
`SIBLING_RATIO` (0.75) of the best. That's **relative, not absolute**, so it scales to wherever this
user's similarities actually sit. Cap `MAX_RECALL` (6). Recall then reinforces what it returned.

Fallback: no clusters at all (empty memory, or `ensureClusters` degraded) → flat scan, rather than
silently remembering nothing.

> Still TODO from the original spec: keyword/exact-term match alongside vectors (so names and dates
> aren't blurred away) and queryable time ("what did we talk about last week").

## 4. Memory clusters — prototypes, not chains

`lib/memory/clusters.ts`. **This supersedes M4c topic threading; `topics.ts` is deleted.**

**Why.** Single-linkage joined a block to whichever *single* block it sat nearest, and that
**chains**: A~B at 0.88 and B~C at 0.88 filed A and C under one topic even at A·C = 0.55 — and recall
then dragged the whole contaminated thread back. Scoring against a **centroid** (the cluster's centre
of mass) removes the chain: a memory must belong to the whole idea, not to one straggler on its edge.

**A cluster = prototype (centroid) + emotional signature.** Salience-weighted `valence`/`arousal`, so
felt memories weigh more in what a cluster feels like.

**Emotion MODULATES, never binds.** Meaning decides what a cluster *is*; feeling only moves membership
at the margin:
- `SEMANTIC_FLOOR` (0.82) is a hard gate — below it, feeling gets no vote. This is what prevents
  "everything sad in one bucket," which is not how people remember.
- Above it, congruence swings affinity by ±`EMOTION_W` (λ = 0.08): `affinity = sim · (1 + swing)`.
- Congruence weights **valence 0.7 / arousal 0.3** — warm-vs-bleak separates memories far more than
  loud-vs-quiet.

**The join bar rises for a reason** — `joinThreshold = BASE_JOIN(0.85) + tightness·0.04 + arousal·0.04`:
- *tightness* — a tight cluster is a precise idea, so it demands a closer match than a broad theme;
- *arousal* — **Von Restorff**: a vivid memory resists absorption, so the night something broke stays
  its own vivid thing instead of being quietly filed under "work chat".

**Invariants — break these and it fails silently:**
1. `cosine` is a **bare dot product**, so centroids **must** be normalized. `normalize(Σ)` is exactly
   the normalized mean (the 1/n cancels) — which is why the cluster stores `sum` and derives
   `centroid` from it.
2. Accumulators (`simSum`/`wSum`/`vSum`/`aSum`) exist so `addMember` is **exact and O(1)**. `radius`
   is the one approximation (the centroid moves under it); sleep recomputes it exactly.
3. **Clusters are derived → deliberately NOT exported or synced.** Only blocks are truth. This is
   what makes aggressive re-clustering safe.

**`ensureClusters()`** (memoized per session; called from recall + reflect) is the repair path, and it
handles both jobs at once:
- **migration** from M4c — blocks with no `clusterId` are re-clustered oldest-first, *ignoring* the
  old `topicId` on purpose. That ignoring is what repairs the chained threads.
- **import/sync** — blocks arrive citing clusters this device has never seen (clusters aren't in the
  bundle) → rebuild each from its members.

It's idempotent, a no-op once assigned, **batched** (holds clusters in memory rather than re-reading
two 384-float arrays per block from IndexedDB — otherwise a migration is hundreds of round-trips in
front of a user waiting on their first reply), and it **degrades to unclustered recall rather than
breaking the conversation**.

## 5. Sleep reconciliation

**Status: NOT BUILT — this is M5b, the next milestone in this system.**

Manual trigger for now; idempotent, snapshot-before, watermark, reversible:
1. **Consolidate** the day's raw messages → new blocks, emotion-tagged.
2. **Merge** near-duplicate blocks → one stronger block (keep provenance).
3. **Decay & prune** flat, unemotional, never-recalled blocks → `archived` (raw log untouched).
   Prune emptied clusters too.
4. **Reinforce** the felt + recalled ones (and, through them, their clusters).
5. **Re-cluster** — the online path in §4 is greedy and order-dependent; sleep is where that gets
   fixed. Split clusters that drifted broad, merge ones that converged, recompute each `radius`
   exactly (online it's approximate), and write a **gist** per cluster.
6. **Calibrate the thresholds** — every constant in §4/§3 is currently hard-coded. Sleep is where
   they become **percentile-based, per-user**, derived from that user's observed similarity
   distribution. This is the point: e5's band is narrow and shifts with language mix, so a global
   0.85 is a guess. **This is what finally retires the magic numbers.**
7. **Mood settles** to baseline; strong emotional residue stays *as memory*.
8. **Dream digest** — a short line she can tell you on waking.

Safe by construction: blocks rebuild from the raw log, and clusters rebuild from blocks
(`rebuildFrom`), so sleep can be as aggressive as it needs to be.

## 6. Robustness at scale (many blocks)

- Raw log is the truth; blocks rebuild from it, clusters rebuild from blocks — so aggressive
  pruning/merging/re-clustering is always safe.
- **Cluster-first recall is already the prefilter.** Scoring 3 lit clusters' members instead of every
  block is what bounds retrieval — so the scaling story is now "keep centroids meaningful" (sleep's
  job), not "scan faster".
- Brute-force cosine over centroids is fine to a few thousand blocks. Keep retrieval **behind an
  interface** so an ANN index (hnsw) can drop in later without touching callers. Consolidation keeps
  the active set bounded; cold blocks archived, not deleted.

## Where emotion is detected

- **Real-time (light):** each turn, a cheap parallel call (`deepseek-v4-flash`) reads the user's
  emotional tone → nudges mood immediately, so she feels *with you in the moment*. Keep this
  separate from the reply call so reply quality stays clean. **Locked: yes, do this.**
- **Sleep (heavy):** block extraction, dedup, salience, linking, pruning — batched.

## Build order (each phase ships and is testable on its own)

- **M4a — Mood engine → eyes.** Add `setMood` to the engine; a `lib/mood/` module holding
  valence/arousal/bond with the mirroring transform + per-frame decay; `app/api/mood` light
  emotion read; page wires user messages → emotion read → mirroring → `setMood`. *Acceptance: talk
  to her happy vs sad and her resting eyes visibly shift; verify by forcing mood values via eval.*
- **M4b — Blocks + embeddings + recall.** (DONE) transformers.js embeddings (worker); block extraction
  from raw log; `lib/memory/recall.ts` implementing the hybrid score behind an interface; recalled
  blocks injected into the LLM context. Also fixed CONFABULATION here — a hard "never invent facts
  about the user" boundary, which is what lets §3's floors stay loose.
- **M4c — Topic threading.** (DONE, then **SUPERSEDED by M4d** — `topics.ts` deleted. Kept in this
  list only so the chaining bug in §4 doesn't get reinvented.)
- **M4d — Memory clusters.** (DONE, `69a3073`.) §4 + §3: prototypes replace chains; recall goes
  cluster-first with spreading activation. DB `ciocu` → v3 (`clusters` store, `by-cluster` index).
- **M5a — Portability + sync.** (DONE) One versioned bundle for both file export and cross-device
  sync. Blocks only — clusters are derived and rebuild on arrival.
- **M5b — Sleep.** (NEXT) The §5 pipeline: re-cluster/split/merge/gist/decay/prune + the
  percentile calibration that retires §4's hard-coded thresholds.
- **M5c — Recall → mood feedback.** Closes the loop in the diagram: what she remembers should move
  how she feels, not just the reverse.

## Working style for this system

Prefer explaining *why* in code comments (the emotional/temporal reasoning) over rigid rules —
the model tuning matters and future changes need the intent. Keep the eye-facing mood mapping and
the UI's cyan accent visually coherent. When in doubt, protect the raw log and keep blocks
disposable.
