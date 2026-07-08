# Anime Eye Interface — Research & Prototype

Research and a working, animated design for a **fluid two-eye robot/companion interface** — an
expressive face where *only the eyes* carry the emotion (inspired by the KEENON service-robot
screen: two huge glowing eyes on a dark display).

The whole personality lives in the eyes: shape, gaze, glow, blink rhythm, and the tiny
anime-style reflections/particles floating inside the iris.

## What's here

| Path | What it is |
|------|-----------|
| [`prototype/index.html`](prototype/index.html) | **The living v4 baseline.** Full-screen 16:9 animated eyes with a state machine (neutral default + ~12 expressions), auto-blink, idle micro-saccades, breathing, gaze-follow, and the big glossy dark-orb "cute creature" look. Open it in a browser. |
| [`prototype/candidates/`](prototype/candidates/) | **Design iterations + self-evaluation.** v1 (anime cyan) -> v2 (kawaii glow) -> v3 (liquid eye) -> v4 (winner) -> **v6 plush companion (new cutest direction)**. See [`EVALUATION.md`](prototype/candidates/EVALUATION.md). `v6-plush-companion.html` is the latest saved candidate; the live app engine has been ported to this look. |
| [`prototype/anime-blue-eyes.html`](prototype/anime-blue-eyes.html) | **Second style — realistic anime eyes.** A different aesthetic modelled on a specific character: light **skin-tone** ground, **white sclera**, bold **dark lid/lash contour** + outer flick, glossy **blue iris** (gradient, radial striations, pupil, glassy highlights). Animated with skin-coloured eyelids that slide for blink + 6 lid-based expressions + gaze-follow. No hair/brows — just the eyes. |
| [`research/01-eye-anatomy-and-layers.md`](research/01-eye-anatomy-and-layers.md) | How an anime eye is built as **stacked layers** (sclera → iris body → limbal ring → striations → pupil → lower bounce-glow → primary/secondary catchlights → floating sparkles → cornea sheen). This is the "details matter" part. |
| [`research/02-expression-taxonomy.md`](research/02-expression-taxonomy.md) | The **feelings/emotions** catalog. Which eye parameters change for happy, sad, surprised, angry, sleepy, love, etc. — the anime shorthand for each. |
| [`research/03-presence-states.md`](research/03-presence-states.md) | **States of presence** (idle / listening / questioning / affirmative / dedicated-focus / thinking / processing). These are *behavioral* states more than emotions — how the robot signals what it's doing. |
| [`research/04-final-design-spec.md`](research/04-final-design-spec.md) | The **default full-screen 16:9 look** and the animation/parameter model to build the real app on top of. |
| [`research/05-relatable-creature-eyes.md`](research/05-relatable-creature-eyes.md) | **Why simple big-eyed creatures feel relatable** — Pikachu, Grogu, Kirby, EVE, Baymax, Toothless. The four levers (baby schema, simplification-as-projection, the catchlight, roundness) and a relatability checklist to make the robot face *loved*, not just expressive. |
| [`research/06-v6-plush-companion-visual-research.md`](research/06-v6-plush-companion-visual-research.md) | **Visual reference pass for v6.** LOVOT, Baymax minimalism, social-robot uncanny-valley cautions, and robot/anime eye shape notes distilled into the v6 plush companion direction. |

## The core idea

An eye is not "white + black." It's a **parametric stack** of ~10 layers, and an *expression*
is just a target set of values for a handful of parameters (openness, curvature, tilt, gaze,
pupil size, glow, hue). Animating = smoothly interpolating (easing) between parameter sets.
Get the layer stack and the parameter model right once, and every emotion becomes a preset.

## How to use the prototype

Open `prototype/index.html` in any modern browser.

- The **default state** is the neutral full-screen hero look (this is your app's "resting face").
- Bottom bar: click any expression to transition to it (watch it ease, not snap).
- **Move your mouse** — the gaze follows (presence).
- Keys: `H` hide/show UI · `F` fullscreen · `Space` blink · `1–9` quick expressions.
- Everything is one self-contained file (SVG + JS, no dependencies).
