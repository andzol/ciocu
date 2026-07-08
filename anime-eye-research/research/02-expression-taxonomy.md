# 02 — Expression Taxonomy (Feelings / Emotions)

> The trick: you are not drawing 12 different eyes. You are moving **7 parameters** to 12 different
> target values. An "expression" is a preset. Animation is easing between presets.

## The parameter model

Every expression is a point in this small parameter space (per-eye where noted):

| Param | Range | What it controls | Anime meaning |
|---|---|---|---|
| `open` | 0 – 1.4 | vertical openness (lid) | wide = alert/innocent, narrow = intense/tired |
| `topBend` | -1 – 1.4 | top-edge curvature | high round top = cute/young |
| `botBend` | -1 – 1.4 | bottom-edge curvature | **negative = smiling squint** (⌒ crescent) |
| `tiltInner` | -20° – 20° | rotation of inner corner (mirrored) | **down-inner = angry**, down-outer/up-inner = sad |
| `gazeX/Y` | -1 – 1 | pupil + highlights offset | direction of attention |
| `pupil` | 0.4 – 1.6 | pupil scale | small = shock/focus, large = love/joy |
| `glow / hue` | — | rim-glow intensity, color mood | warmth, energy, mood color |

Plus **motion signatures** (the timing, which matters as much as the pose): tremble, bounce,
slow-drift, snap, pulse.

## The catalog

### 😐 Neutral (default)
Tall symmetric lens, gentle off-center iris glow, both catchlights present, slow breathing bloom,
occasional blink, tiny idle saccades. `open 1.0 · botBend 1.0 · pupil 1.0 · gaze 0,0`.
This is the resting face — see doc 04.

### 😊 Happy / Joyful
The signature move: **bottom edge curves upward** into a crescent (`botBend → -0.6`), eyes squint
up. The classic closed `^_^`. Pupils dilate slightly, lower rim glow brightens, catchlights flare,
sparkles speed up. Optional tiny upward bounce. *This is the money expression — make it warm.*

### 😲 Surprised / Shocked
Eyes snap **wide and round** (`open 1.35`, top/bottom bend up, near-circular), **pupil shrinks
hard** (`pupil 0.5`), catchlights flare bright, a fast single overshoot. Hold, then settle.
Motion = *snap*, not ease.

### 🥺 Sad / Hurt
Openness drops (`open 0.8`), top edge flattens, **inner corners lift / outer droop** (sad tilt),
**gaze drops** (`gazeY +0.4`), lower rim glow *dims*, hue desaturates cool. Add a slow **tremble**
and slightly slower blinks. Optional: pupils grow (welling up).

### 😠 Angry / Stern
**Inner top corners drive down** (`tiltInner → down-inner`), openness narrows (`open 0.6`), top
edge becomes a hard slant (the `>‿<` / `╲ ╱` brow-less scowl). Glow intensifies, hue pushes warm/red,
pupils shrink and lock center. Motion = tense micro-jitter.

### 😴 Sleepy / Tired
Half-lidded (`open 0.45`), gaze drifts down, everything *slows* — long lazy blinks that hang closed
a beat, glow dims and pulses slowly. The blink timing is the whole read here.

### 😍 Love / Adoring
Hue shifts **pink/magenta**, pupils **dilate big** (`pupil 1.5`), catchlights become **heart-shaped**
(or extra sparkles), lower glow warm and bright, a gentle up-down "swoon" bob. Extra floating
sparkle particles.

### 😉 Wink
Per-eye: one eye does a quick full blink-and-hold (`open→0.05`) while the other stays open and often
goes slightly *happy* (crescent). Playful, asymmetric — the classic personality beat.

### 😳 Shy / Bashful
Gaze breaks away (looks down-and-aside, `gazeX ±0.5, gazeY +0.3`), openness slightly down, hue
warms faintly (blush), small nervous saccades. It's mostly a *gaze* expression.

### 🙄 Annoyed / Unimpressed
Half-lid + **gaze rolls up-and-aside**, flat top edge, still. Deadpan. Motion = a slow deliberate
eye-roll arc into position.

### 😢 Crying (extension)
Sad pose + **welling**: pupils large, a bright pooled highlight at the lower rim that grows, then a
tear-glint slides down. Blink releases it. (Optional — needs a tear particle.)

### 😵 Dizzy / Error (extension)
Spiral or `@_@` — pupils replaced by rotating spiral, or eyes become `X`. Useful as a **fault/error
state** for a real robot.

## Emotion → parameter cheat-sheet

| Expression | open | botBend | tilt | pupil | gaze | motion |
|---|---|---|---|---|---|---|
| Neutral | 1.0 | 1.0 | 0 | 1.0 | 0,0 | breathe |
| Happy | 0.9 | **-0.6** | 0 | 1.15 | 0,-0.1 | bounce |
| Surprised | **1.35** | 1.2 | 0 | **0.5** | 0,0 | snap |
| Sad | 0.8 | 0.9 | sad | 1.2 | 0,+0.4 | tremble |
| Angry | **0.6** | 0.8 | **angry** | 0.7 | 0,0 | jitter |
| Sleepy | **0.45** | 1.0 | slight sad | 1.0 | 0,+0.3 | slow |
| Love | 1.05 | 0.5 | 0 | **1.5** | 0,-0.1 | swoon |
| Wink | L:0.05 R:0.9 | -0.4 | 0 | 1.1 | 0,0 | quick |

## Two rules that make it read as anime (not as an emoji)

1. **Asymmetric iris gradient + big/small opposite catchlights.** Symmetry kills it.
2. **Timing carries the emotion as much as the pose.** Happy *bounces in*, surprise *snaps*, sad
   *trembles slowly*. Never transition all expressions at the same speed.
