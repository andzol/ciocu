# Candidate Evaluation — the hunt for the "million dollar" cute look

Process (per the brief): build → screenshot to myself → judge *"is this the most relatable, cute
look I've ever seen?"* → if no, keep researching/improving → if yes, save as a candidate and push
further. Each version below is a saved, runnable snapshot.

## The verdict at a glance

| Ver | File | Look | My honest score | Kept? |
|-----|------|------|:--:|:--:|
| v1 | `v1-anime-cyan.html` | Anime cyan lens eyes, cool/robotic | 6/10 | reference |
| v2 | `v2-kawaii-glow.html` | Rounder, blush, two-tone, star sparkle | 7/10 | option |
| v3 | `v3-liquid-eye.html` | **Big dark liquid orb + bright catchlight** | 9/10 | strong |
| **v4** | **`v4-liquid-eye-polished.html`** | v3 + wet in-eye reflection + lifted blush | **9.5/10** | ✅ **WINNER → `../index.html`** |
| v5 | `v5-anime-blue-flat.html` | Realistic-anime style: flat cel blue iris on v4's rounded eye-white, skin ground, dark contour | — | explored; **v4 still preferred** |
| **v6** | **`v6-plush-companion.html`** | Softer plush robot eye: wider/closer lenses, bigger trust-pupil, warm lower reflection, calmer sparkles | **9.7/10** | new cutest direction -> app engine |

## The reasoning (what each screenshot told me)

**v1 — anime cyan (6/10).** Expressive and slick, but *cool and robotic*, not cuddly. The eye was a
bright glowing iris with a weak dark pupil. Reads "sci-fi interface," not "aww." → Not the cutest.
Keep improving.

**v2 — kawaii glow (7/10).** Applied doc 05's levers: bigger/lower/closer eyes, rounder shape,
Kirby two-tone, blush cheeks, a spinning star sparkle. Cuter — but the **pupil was a grey smudge**
and the eye still read as a *glowing orb* rather than a creature. The dark mass was too small and
muddy. Diagnosis: I had the emphasis inverted. → Not there yet.

**v3 — liquid eye (9/10). The breakthrough.** The most relatable eyes ever made — Pikachu, Grogu,
kittens — are a **big dark liquid eye with a bright highlight sitting on it**, not a bright iris with
a small pupil. So I *flipped the emphasis*: a large, crisp, glossy **dark orb** as the hero, a big
white catchlight on its upper edge + a small opposite one, wrapped in a thin glowing cyan iris with a
bright bottom rim (Kirby bounce-glow). Suddenly it reads as an *adorable pet*. → **Yes, this is
genuinely cute.** Saved as a candidate; pushed one more pass.

**v4 — liquid eye, polished (9.5/10). The winner.** Small, high-leverage additions to v3:
- a **wet bounce-reflection** low inside the orb (the glow reflected in the eye) → the single biggest
  "it's alive and liquid" cue;
- catchlights locked to ride the orb so gaze stays believable.
- *(Update: the blush "cheeks" added in v2 were removed — the soft glows under the eyes read as
  unnatural reflections rather than blush. The eyes now sit on clean dark negative space.)*
Verified the expressions survive the redesign (happy forms a clean `^_^` crescent; love blows the
orb up huge and adorable). This is the "million dollar" default.

## Why v4 is the sweet spot (theory → result)

From `../../research/05-relatable-creature-eyes.md`, the four levers, and where v4 lands them:
1. **Baby schema** — eyes oversized, low, close together. ✅
2. **Simplification = projection** — the resting eye is a dark orb + one highlight; minimal, so people
   project onto it. ✅
3. **The catchlight = the soul** — big highlight on the orb, aimed slightly toward the viewer → reads
   as eye-contact / "it sees me." ✅ (Next: bias it toward a real camera/person.)
4. **Roundness = safety** — everything round; the dark orb is a circle. ✅

It sits between **Hello-Kitty-blank** (projectable but lifeless) and **Grogu-glossy** (alive but
specific), exactly where a companion robot wants to be: simple round shapes + a living, wet,
viewer-aimed eye.

## How to keep pushing past v4 (open ideas, not yet built)

- **Camera/person-tracking catchlight** — bias the big highlight toward the detected face so it
  literally looks like it's meeting your eyes. Biggest remaining "alive" upgrade.
- **Warm variant** — a soft warm-white/amber default reads even friendlier than cyan to some people;
  A/B it. (Cyan keeps KEENON brand identity.)
- **Micro-behaviours** — a tiny "saccade toward you then soften" when you approach; a slow pupil
  dilation when spoken to (Toothless affection dial).
- **Secondary orb reflection** — a faint mirrored "window" shape in the orb for extra glassiness.
- **Sub-surface bloom** — a barely-there inner glow pulse in the orb so it feels warm, not flat.

## v5 — realistic-anime blue eye (a side branch, not the winner)

`v5-anime-blue-flat.html` explores a completely different aesthetic modelled on a specific
character: a **flat cel-shaded blue iris** (built only from solid shapes — no gradients: dark base +
pupil merged near-black, dark-blue oval ring, small light-blue oval tucked under the pupil, white
glare), **white sclera**, **dark lid contour**, on a **flat skin-tone** ground, using **v4's big
rounded eye-white silhouette** to feel less human. It blinks (skin lid slides), gazes, and has 6
lid-based expressions.

**Verdict: interesting, but v4 remains the preferred design.** v5 is more "anime character eye";
v4 is the warmer, cuter, more universally-relatable companion look and stays the winner
(`../index.html`). Keeping v5 as a candidate for the alternate art direction.

## v6 - plush companion eye (new cutest direction)

`v6-plush-companion.html` keeps v4's best discovery - a big dark liquid center with a living
catchlight - but makes the face gentler. The eye pair is wider, slightly lower, and closer together.
The pupil is larger at rest, the surprise state no longer pinholes into fear, and the glow palette is
more mint/soft-teal than scanner-cyan. A tiny warm reflection sits low in the pupil so the dark orb
feels less cold, while the sparkle count is reduced so the neutral state stays projectable.

**Verdict: v6 is cuter than v4 for the actual desktop bot.** It is still clearly a robot screen face,
not a human anime face, and it borrows Baymax's calm minimalism only as a principle. The live app
renderer has been updated to use this v6 construction in `ciocu/lib/eyes/engine.ts` and the matching
expression values in `ciocu/lib/eyes/presets.ts`.

---
To compare any two versions, open the two `.html` files side by side in a browser.
