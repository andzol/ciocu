---
name: ciocu-memory-emotion
description: >-
  The build spec for Ciocu's coupled memory + emotion system — her mood/mental state
  (valence/arousal/bond) wired to her eyes, emotionally-charged memory blocks that strengthen with
  feeling and link by topic over time, hybrid recall, and sleep-based reconciliation. USE THIS
  whenever working on Ciocu's memory, recall, moods, emotions, "mental state", eye expression tied
  to feeling, memory blocks/bubbles, embeddings, the sleep/reconciliation cycle, or memory
  export/import — even if the request only mentions one piece (e.g. "make her react to how I feel",
  "she should remember past chats", "why isn't she recalling X"). Read it before designing or
  changing any of these so the pieces stay coherent.
---

# Ciocu — Memory + Emotion build spec

Ciocu is an empathic companion whose face is two expressive eyes. **Emotion is the spine** that
ties everything together: her mood drives the eyes, feeling makes memories strong, and mood shapes
what she recalls. Build the pieces so they reinforce that, not as isolated features.

Existing foundation (already built): the eye engine (`ciocu/lib/eyes/`) with `setState`/
`setVoiceLevel`; the raw conversation log in IndexedDB (`ciocu/lib/memory/store.ts`); the LLM proxy
(`ciocu/app/api/chat`) using OpenRouter `deepseek/deepseek-v4-flash`; attention/gaze (`ciocu/lib/
attention/`). Local embeddings will use transformers.js (MiniLM/bge-small), on-device.

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
      resting expression)         + emotional charge → salience
                                   + topic links)
               ▲                             │
               │ mood-congruent recall       │ RECALL
               └─────── surfaces ────────────┘
                        ▲
                        │ nightly
                   SLEEP reconciles: merge topics · strengthen the
                   felt ones · let flat/irrelevant ones fade
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
  emotion: { valence, arousal },              // how it felt when formed
  salience,          // strength = f(|arousal| at formation, reinforced, recency)
  reinforced,        // ++ on each recall
  topicId, links[],  // same-topic blocks join over time
  status: 'active' | 'archived' | 'superseded',
  supersedes?, sourceMsgIds[]                 // provenance → raw truth
}
```

**Strong feeling ⇒ strong memory.** High `|arousal|` at formation tags a block as *key*: high
salience, resists decay, surfaces easily later (the amygdala trick). This is the heart of "key
memories where strong feelings emerge."

## 3. Recall — hybrid, multi-signal

```
score = w1·semantic(query, block)       // what it's about (cosine on embeddings)
      + w2·recency(now − lastSeen)       // TIME constraint
      + w3·salience                      // felt/important memories surface
      + w4·topicProximity                // linked to already-active blocks
      + w5·moodResonance(mood, block)    // recalls congruent to how she feels
```
Plus a **continuity guarantee**: always load the current topic thread regardless of score, so
"pick up where we left off" is reliable. Keep keyword/exact-term match alongside vectors so names
and dates aren't blurred away. Time is queryable ("what did we talk about last week").

## 4. Topic threading over time

Each new block finds its nearest existing blocks; above a similarity threshold it **joins their
topic cluster**. A topic accumulates across sessions — "the thing you keep coming back to." Recall
can pull a whole topic thread.

## 5. Sleep reconciliation

Manual trigger for now; idempotent, snapshot-before, watermark, reversible:
1. **Consolidate** the day's raw messages → new blocks, emotion-tagged.
2. **Merge** near-duplicate / same-topic blocks → one stronger block (keep provenance).
3. **Decay & prune** flat, unemotional, never-recalled blocks → `archived` (raw log untouched).
4. **Reinforce** the felt + recalled ones.
5. **Relink** topics.
6. **Mood settles** to baseline; strong emotional residue stays *as memory*.
7. **Dream digest** — a short line she can tell you on waking.

## 6. Robustness at scale (many blocks)

- Raw log is the truth; blocks are rebuildable — so aggressive pruning/merging is always safe.
- Brute-force cosine is fine to a few thousand blocks. Keep retrieval **behind an interface** so an
  ANN index (hnsw) can drop in later without touching callers. Prefilter by recency/topic before
  scoring. Consolidation keeps the active set bounded; cold blocks archived, not deleted.

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
- **M4b — Blocks + embeddings + recall.** transformers.js embeddings (worker); block extraction
  from raw log; `lib/memory/recall.ts` implementing the hybrid score behind an interface; recalled
  blocks injected into the LLM context. *Acceptance: reference something from an earlier session and
  she brings it back.*
- **M4c — Topic threading.** Link blocks into topic clusters on write; recall can pull a thread.
- **M5 — Sleep + export.** The reconciliation pipeline, dream digest, and wire the hamburger's
  Download/Upload memory to versioned JSON export/import of the whole store.

## Working style for this system

Prefer explaining *why* in code comments (the emotional/temporal reasoning) over rigid rules —
the model tuning matters and future changes need the intent. Keep the eye-facing mood mapping and
the UI's cyan accent visually coherent. When in doubt, protect the raw log and keep blocks
disposable.
