# 01 — Anime Eye Anatomy & Layer Stack

> The single most important idea in the whole project: an anime eye is a **stack of layers**, not a
> shape. The "life" and the expensive-looking detail come from how light plays across a curved,
> wet, glassy surface. You reproduce that with layers, not with one gradient.

## Real eye → what each part becomes in anime

| Real anatomy | Function | Anime translation |
|---|---|---|
| **Sclera** | white of the eye | Simplified/omitted on a robot face; on our dark screen it's *negative space* (the black around the glowing iris) |
| **Iris** | colored ring | The **hero**. In anime it's blown up to fill most of the eye — a glowing gradient disc |
| **Pupil** | hole, looks black | A dark core that gives the eye a *center of focus* and reads gaze direction |
| **Cornea** | clear wet dome | The reason for the **big white highlight** (catchlight). This is what makes eyes look *alive* vs. dead |
| **Limbus** | iris/sclera border | The **limbal ring** — a darker rim that makes the iris pop and read as 3D |

Key insight from reference art: those bright circles in anime eyes are **highlights representing
nearby light sources**, not reflections of the environment. Usually **one dominant (large)
highlight** and **one subordinate (small) highlight** on the opposite side. Following that "big +
small, opposite corners" rule is 80% of why an eye looks correctly anime.

## The layer stack (back → front)

Draw/composite in this order. Each layer is cheap on its own; the *stack* is what looks expensive.

```
┌─ 11 · CORNEA SHEEN ── faint diagonal glassy gradient over everything
├─ 10 · MICRO SPARKLES ─ 4–10 tiny drifting dots + soft bokeh (the "particles")
├─  9 · SECONDARY CATCHLIGHT ─ small highlight, opposite the primary
├─  8 · PRIMARY CATCHLIGHT ── large highlight, upper area (dominant light)
├─  7 · LOWER RIM GLOW ────── bright crescent along the bottom inner iris (bounce light)
├─  6 · PUPIL ──────────────── dark core, carries GAZE
├─  5 · IRIS STRIATIONS ────── faint radial rays / concentric ring texture
├─  4 · IRIS BODY GRADIENT ─── the glowing color: bright center → deep edge
├─  3 · LIMBAL RING ────────── dark outer rim, thin
├─  2 · EYE SHAPE / LID ────── the silhouette you morph for expression
└─  1 · OUTER GLOW / BLOOM ─── blurred copy of the shape behind it (screen glow)
```

### What each layer *does* for you

- **1 Outer glow / bloom** — sells "emissive screen." A Gaussian-blurred, dimmer copy of the eye
  shape sitting behind it. Breathe its intensity slowly for an idle "alive" pulse.
- **2 Eye shape / lid** — the *only* layer whose silhouette you morph. Everything else lives clipped
  inside it. Owning this one path well = owning all expressions (see doc 02).
- **3 Limbal ring** — 1–3px darker rim. Tiny, but removing it makes the eye look flat and cheap.
- **4 Iris body gradient** — radial, **off-center** (brighter toward lower-center where bounce light
  hits). This asymmetry is critical — a perfectly centered gradient looks dead/robotic.
- **5 Striations** — very subtle radial lines or a faint concentric ring. On a small robot screen
  you can fake it with 1–2 low-opacity rings. Adds "the iris has depth."
- **6 Pupil** — the gaze pointer. Its position (not the eye's) is what people read as "looking at
  me." Shrinks when surprised/focused, dilates when happy/loving.
- **7 Lower rim glow** — a bright crescent hugging the bottom inner edge. This is the trademark
  "anime sparkle glow" and reads as innocence/warmth. Dim it for sad/angry.
- **8 Primary catchlight** — big, soft, upper area. Moves *with* gaze but lags/travels less than the
  pupil (it's a surface reflection, so it slides). Rounded-rect or oval — **never a hard circle**;
  follow the curve of the eye.
- **9 Secondary catchlight** — small, opposite corner from the primary. Provides the "two light
  sources" realism.
- **10 Micro sparkles / bokeh** — 4–10 tiny bright dots + 1–2 larger blurred soft circles, slowly
  drifting and twinkling. **This is the "lots of small particles" the design brief calls for.**
  They cost almost nothing and are the difference between "LED eye" and "anime eye."
- **11 Cornea sheen** — a faint diagonal light gradient over the top third. The final "wet glass"
  varnish.

## Gaze parallax (why it looks 3D)

When the eye looks around, the layers move by **different amounts** — this fake parallax is what
makes a flat screen read as a rounded, glassy dome:

| Layer | Moves with gaze | Relative amount |
|---|---|---|
| Pupil | yes | **100%** (leads) |
| Lower rim glow | yes | ~70% |
| Secondary catchlight | yes | ~50% |
| Primary catchlight | yes | ~35% (surface reflection — slides least) |
| Sparkles | drift independently | ~20% + own motion |
| Iris body / limbal ring | slight | ~10% |
| Eye shape | no (mostly) | 0% |

Rule of thumb: **deeper layers move more, surface reflections move less.** Invert that and the eye
looks painted-on.

## Emissive vs. reflective (robot-specific)

A physical anime drawing is *reflective* (dark room = dark eyes). Our eye is a *screen* — it's
**emissive**. That changes two things:
1. Highlights should read as *self-lit*, slightly overexposed/bloomed, not as mirror reflections.
2. Keep catchlights **pure white** (or near-white) so mood **hue-shifts** (love=pink, sad=blue)
   tint the iris but leave the highlights clean and sparkly.

---
**Sources**
- [Realistic Eyes vs Anime Eyes — LOTHLENAN](https://www.lothlenan.com/tutorialsblog/2021/1/23/realistic-eyes-vs-anime-eyes)
- [Drawing & Colouring Perfect Anime Eyes — CLIP STUDIO TIPS](https://tips.clip-studio.com/en-us/articles/10248)
- [Beyond the Sparkle: Anime Eye Coloring — Oreate AI](https://www.oreateai.com/blog/beyond-the-sparkle-unlocking-the-magic-of-anime-eye-coloring/772f59241c1c47246ae161fdaa7249ec)
- [Learn to Draw Anime Eyes — Gvaat's Workshop](https://gvaat.com/blog/finally-learn-to-draw-anime-eyes-a-step-by-step-guide/)
