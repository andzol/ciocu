# 03 — States of Presence (Behavioral / Cognitive)

> Emotions (doc 02) say *how the robot feels*. **Presence states** say *what the robot is doing* —
> is it idle, listening to you, asking a question, confirming, or busy thinking? These are the
> states a real interface switches between constantly, and they're mostly built from **gaze,
> timing, and micro-motion** rather than dramatic shape changes.

Humans read these from a person's eyes instantly, so they're the highest-value states for a
face-with-only-eyes UI.

## The presence states

### ○ Idle / Ambient
The robot is on but not engaged. Neutral shape, **slow breathing bloom**, occasional natural blink,
lazy **micro-saccades** (tiny random gaze shifts every 2–6s), gaze may slowly wander or track a
passer-by. Goal: *alive but not demanding attention.* Avoid a fixed spooky stare — always blink.

### ◉ Listening / Attentive
Someone is speaking to it. **Gaze locks toward the user** (center or toward the mic/sound source),
eyes open a touch wider, a **subtle rhythmic pulse** of the glow synced to detected voice (like a
nod of "I'm receiving you"). Blinks become slightly more frequent (engaged). Micro-saccades reduce —
it's *paying attention*.

### ？ Questioning / Inquisitive
The robot needs input or is uncertain. The universal tell is a **head-tilt** — implemented as a
**whole-eye-group rotation (~7–12°)** plus one eye slightly larger than the other, **gaze up** and
holding. A brief hold, sometimes a small "hmm?" re-tilt. Optionally surface a literal `?` glyph, but
the tilt alone reads as a question. This maps directly to your "having a question" state.

### ✓ Affirmative / Acknowledged
"Yes / got it / done." A **crisp downward nod** — eyes dip and rise once (or twice), landing in a
brief **happy crescent** (`botBend` negative), glow gives a confident bright pulse. Fast, snappy,
positive. The *motion* (the nod) is the whole signal. Maps to your "affirmative" state.

### ✗ Negative / Declined
"No / can't do that." A quick **horizontal shake** (gaze/eyes flick left-right-left), often with a
brief look-away, glow dims once. Opposite motion signature to the nod.

### ◎ Dedicated / Focused
"I'm on it — working with intent." Eyes **narrow horizontally** (determined squint, `open ~0.75`),
**pupils converge slightly inward** (fixation), glow **intensifies and holds steady**, gaze locked
center or center-up. Minimal blinking, minimal drift — the *stillness* reads as concentration.
Maps to your "dedicated" state.

### ⟳ Thinking / Processing
"Computing / retrieving." Gaze drifts **up-and-to-one-side** (the universal "recalling" look),
slow **circular or side-to-side wander**, periodic soft glow pulses, slower blinks. Distinct from
Focused: thinking *wanders*, focused *locks*. Optionally a subtle rotating spark/loader in the iris.

### ⣾ Loading / Busy (system)
A pure system state: pupils/sparkles animate in a **looping pattern** (orbit, sweep, or the iris
shows a spinner), gaze may go semi-neutral. Signals "don't expect a response yet."

### ☾ Sleep / Standby
Low-power. Eyes close to thin lines or a **flat resting slit**, glow drops to a dim ember that
breathes very slowly. A tap/wake event does a smooth **eyes-open + brighten** transition back to
Idle.

### ! Alert / Notification
Wants your attention. A quick **widen + double glow-flash**, gaze snaps toward the user, maybe a
color pop. Then settles to Listening.

## Presence state map

| State | Gaze | Openness | Glow | Signature motion | Blink rate |
|---|---|---|---|---|---|
| Idle | wander | 1.0 | slow breathe | micro-saccades | normal |
| Listening | on user | 1.1 | pulse w/ voice | steady, locked | slightly up |
| Questioning | up + hold | 1.0 (asym) | steady | **head-tilt** | low |
| Affirmative | center | crescent | bright pulse | **nod** | — |
| Negative | look away | 1.0 | dim once | **shake** | — |
| Dedicated | center-up lock | 0.75 | intense/steady | converge, still | very low |
| Thinking | up-aside wander | 0.9 | soft pulses | slow wander | slow |
| Loading | neutral | 1.0 | pattern | looping orbit | — |
| Sleep | closed slit | 0.05 | dim ember | very slow breathe | — |
| Alert | snap to user | 1.3 | double flash | widen + flash | — |

## Design principle: **presence = gaze + timing**, emotion = shape

Presence states deliberately share the *same eye shapes* as neutral — you tell them apart by **where
the eyes look and how they move**, not by dramatic morphs. This keeps state transitions smooth and
lets emotion (shape/color) and presence (gaze/motion) **compose** — e.g. *happy + listening*, or
*focused + a bit annoyed*. Build them as two independent layers on top of the base eye.

## Suggested state machine (for the real app)

```
            ┌──────── Alert ◄─── notification
            ▼
  Sleep ──► Idle ──► Listening ──► Thinking/Loading ──► [Affirmative | Negative | Questioning]
    ▲         ▲            │                                        │
    └── timeout ───────────┴──────────────── back to Idle ◄────────┘
```
Emotion (happy/sad/…) is a **modifier** applied on top of whatever presence state is active.
