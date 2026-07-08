# 04 — Final Design Spec (the 16:9 default look + build model)

This is the spec the real app is built on. The **default (neutral) full-screen look** is the hero;
everything else is a transition away from and back to it.

## The default full-screen 16:9 look

```
┌──────────────────────────────────────────────────────────────┐
│                                                                │
│                                                                │
│                                                                │
│            ╭─────────╮              ╭─────────╮                │
│           │  ●●●●●●●●● │            │ ●●●●●●●●●  │               │  ← two tall glowing
│           │ ●●● ◍ ●●●● │            │ ●●●● ◍ ●●● │               │    cyan lens-eyes
│           │  ●●●●●●●●● │            │ ●●●●●●●●●  │               │    with sparkle detail
│            ╰─────────╯              ╰─────────╯                │
│                                                                │
│                        (dark screen)                           │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

**Layout (proportional, so it scales to any 16:9 panel):**

| Property | Value | Notes |
|---|---|---|
| Canvas | 16:9, fills screen | letterbox if panel isn't 16:9 |
| Eye height | ~46% of screen height | "huge eyes," KEENON-scale |
| Eye width | ~22% of screen width | tall lens ratio ≈ 1 : 1.5 (w:h) |
| Gap between eyes | ~10% of screen width | close enough to read as one face |
| Eyes vertical center | ~48% (a touch above middle) | slightly high = friendlier/younger |
| Background | near-black radial `#0a0e14 → #05070b` | subtle center-up vignette |
| Eye color | cyan, center `#d6fbff` → `#22d3ee` → edge `#0b4a5e` | emissive, off-center gradient |
| Outer bloom | soft cyan Gaussian glow behind each eye | breathes ±8% over ~4s |

**Always-on "alive" behaviors in the default state (never a dead stare):**
- **Breathing bloom** — glow scales ~±8% on a slow ~4s sine.
- **Auto-blink** — every 3–7s (randomized), fast close (~90ms) + slower open (~140ms); occasional
  double-blink.
- **Micro-saccades** — tiny gaze shifts (±0.1) every 2–6s.
- **Gaze-follow** (if a camera/mouse/presence sensor exists) — pupils + highlights track the person,
  with parallax (doc 01).

## The parameter model (what the app animates)

One state object; expressions/presence set a **target**; a rAF loop **eases** current → target.

```js
state = {
  // shape (per eye where it matters)
  open,          // 0–1.4  vertical openness
  halfW, halfH,  // base size
  topBend, botBend, // edge curvature (botBend<0 = smile crescent)
  tiltInner,     // deg, mirrored L/R
  // gaze (shared) — drives pupil + highlights with parallax
  gazeX, gazeY,  // -1..1
  pupil,         // pupil scale
  // look & feel
  glow,          // rim + bloom intensity
  hue, sat,      // mood color shift (cyan default)
  // system
  blinkL, blinkR,// per-eye blink multiplier (for wink)
  groupTilt,     // whole-face tilt (questioning head-tilt)
}
```

**Two independent layers compose:**
- **Emotion layer** → sets shape + color (`open, bend, tilt, pupil, hue`).
- **Presence layer** → sets gaze + motion (`gazeX/Y, groupTilt, glow pulse, blink rate, saccades`).

So `happy` + `listening` = happy shape/color with attentive gaze. Keep them separate.

## Easing / timing (the "fluid" requirement)

- Default transition: **critically-damped / ease-out**, ~180–320ms. Feels responsive, not floaty.
- Per-emotion overrides (from doc 02): surprise = *snap* (fast, slight overshoot); sad = *slow*
  (~600ms) + tremble; happy = *bounce* (overshoot on the crescent).
- Blink is **not** eased linearly — asymmetric (fast close, slower open) is what makes it read
  organic.
- Never transition everything at one uniform speed — that's the #1 tell of a cheap robot face.

## Rendering approach

- **SVG** for the prototype (crisp gradients, easy filters, resolution-independent). Fine up to
  ~4K panels.
- For an embedded/low-power target (ESP32 + OLED like the FluxGarage RoboEyes / KEENON class),
  reimplement the *same parameter model* on a 2D canvas/framebuffer; drop sparkle count and blur
  radius, keep shape + one catchlight + rim glow.
- The parameter model is renderer-agnostic on purpose — design once, render anywhere.

## Detail budget (the "particles matter" requirement)

Per eye, in priority order (cut from the bottom on weak hardware):
1. Iris body gradient (off-center) — **required**
2. Limbal ring — required (cheap, huge payoff)
3. Primary catchlight — required
4. Lower rim glow — required (this is the anime "soul")
5. Secondary catchlight
6. 4–10 micro sparkles + 1–2 bokeh — the floating "particles"
7. Iris striations / concentric ring
8. Cornea sheen overlay
9. Outer bloom

## Palette variants (mood hues, keep catchlights white)

| Mood | Iris center → edge | Use |
|---|---|---|
| Cyan (default) | `#d6fbff → #22d3ee → #0b4a5e` | neutral / calm / presence |
| Warm gold | `#fff3d6 → #f4c430 → #7a5a12` | happy / affirmative |
| Pink | `#ffe0f0 → #ff6fb5 → #7a1f4d` | love |
| Cool blue | `#dbe9ff → #6aa8ff → #1a2f66` | sad / sleepy (desaturated) |
| Red-amber | `#ffe0d0 → #ff5a3c → #6a1500` | angry / alert / error |

Implementation shortcut used in the prototype: keep one cyan gradient and apply an animated CSS
`hue-rotate()` + `saturate()` to the eye group for mood shifts — white catchlights stay clean.

## Build order for the real app

1. Ship the **neutral default** with breathing + blink + saccades (this alone looks alive).
2. Add **gaze-follow** to whatever presence input you have.
3. Add the **presence layer** (idle/listening/questioning/affirmative/focused/thinking).
4. Add the **emotion presets** as color+shape modifiers on top.
5. Tune **timing signatures** per state — this is where it goes from "nice" to "characterful."

See [`../prototype/index.html`](../prototype/index.html) for a working implementation of all of the
above.
