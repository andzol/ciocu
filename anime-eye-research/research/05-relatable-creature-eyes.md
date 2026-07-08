# 05 — Why Simple Big-Eyed Creatures Feel Relatable

> Pikachu, Grogu (Baby Yoda), Kirby, EVE, Baymax, Toothless, Funko Pops. They share almost no visual
> vocabulary — but their *eyes* pull the same four levers. This doc reverse-engineers those levers so
> the robot face can borrow them. It's the most important doc for *likeability* specifically (docs
> 01–04 are about *expression*; this one is about *attachment*).

## The four levers of a relatable eye

### 1. Kindchenschema — the caregiving reflex (biology)
Konrad Lorenz's "baby schema": a cluster of infant features — **large head, big low-set eyes**, round
face, small nose/mouth — that we're wired to find cute and to want to *protect*. Studies show faces
with more of these features are rated cuter, get more caretaking, and literally **activate the brain's
reward system**. Big eyes aren't *decoration* — they trip an involuntary nurture response.

**The rule this gives us:** make the eyes occupy an *unrealistically large* share of the face, and
place them **low** (below the vertical midline). Adult eyes sit at the head's midline; baby eyes sit
lower. Lower = younger = more protected-feeling.

### 2. Simplification = projection (semiotics — Scott McCloud)
In *Understanding Comics*, McCloud's key idea: **the simpler and more iconic a face, the more people
see themselves in it.** A photorealistic face is a specific *other person*; two dots and a curve is
*anyone* — including you. This "masking effect" is why the reader inhabits a simple cartoon but only
observes a detailed one.

Big-eyed creatures are deliberately *under-detailed* so you **project** onto them. Pikachu is famous
for **"expressive neutrality"** — it can read brave, smug, or heartbroken with tiny changes because
the base is a near-blank canvas you fill in. **Less detail = more relatable, not less.**

**The rule:** keep the *neutral* eye minimal (a dark/glowing mass + one highlight). Every added detail
narrows who can see themselves in it. Detail is for *expression deltas*, not the resting face.

### 3. The catchlight = the soul (perception)
The single white highlight is doing enormous work:
- It signals a **wet, living** surface — dead/dry eyes read as sick, hostile, or robotic.
- Its **position implies gaze**. Placed toward the viewer, it says *"I'm looking at you,"* triggering
  the eye-contact bond we use for social connection. A creature that seems to *see you* feels *aware*.
- On an otherwise flat black eye, that one dot is the entire difference between "button" and "alive."

**The rule:** never a highlight-less eye for a companion. One big catchlight (life) + one small opposite
(realism), positioned to feel aimed at the person.

### 4. Roundness = safety (contour bias)
Humans reflexively read **curves as safe and angles as threat** (the "contour bias" — sharp shapes
ping the amygdala). Relatable creatures round *everything*: round eye outline, **round pupils** (a
*slit* pupil instantly reads reptile/predator — see Toothless flipping between round=affectionate and
slit=hunting), soft catchlights, no hard corners.

**The rule:** default to circles and soft lenses; reserve angles strictly for anger/alert.

## Character teardown — eyes only

| Character | Eye construction | The relatable trick |
|---|---|---|
| **Pikachu** | Black circle + 1 white highlight. That's it. | *Expressive neutrality* — the blankest base repositions into any emotion; you project the rest. Eyes were **enlarged over generations** to push cuteness. |
| **Grogu / Baby Yoda** | Huge, wet, glossy dark orbs filling the face | Baby schema *maxed* — eye-to-face ratio so extreme it overrides everything else. The **wet gloss** (big soft highlights) reads as welling/innocent. |
| **Kirby** | Tall oval, **two-tone**: dark top → lighter blue bottom, highlight up top | The **vertical gradient** fakes depth & shine with zero linework — a whole "glassy eye" from two colors. Cheapest high-payoff trick here. |
| **EVE (WALL·E)** | Flat blue LED eyes on a black screen that **morph shape** | *Directly your app.* Proof that pure shape-shifting glowing eyes — no iris, no pupil — carry full emotion. Angled slits = suspicion, curved = warmth. |
| **WALL·E** | Binocular lens eyes that **tilt, widen, and focus** | Mechanical parts, but *aperture + tilt* = emotion. Widening iris = wonder; converging = focus. |
| **Baymax** | Two dots joined by a thin line | *Extreme* minimalism (from a Japanese bell). Warmth comes purely from **proportion and roundness**, no detail at all — the far end of McCloud's scale. |
| **Toothless** | Cat eyes with **dilating pupils** | The **pupil as an affection dial**: round & dilated = loving/trusting; narrowed slit = alert/predator. One parameter flips the whole read. |
| **Hello Kitty** | Two solid black ovals, *no* highlight, no mouth | The **blank** extreme — so featureless it becomes a pure projection surface / mood mirror. Works via total neoteny; note it trades "aliveness" for "projectability." |
| **Funko Pop** | Oversized head, solid black oval eyes | Baby schema by *ratio* alone — no expression at all, yet appealing because head:eye proportion does all the work. |
| **Minions** | Big round goggle eyes, brown iris + highlight | Eyes are literally the biggest feature; **single vs. double eye** and pupil direction carry all the comedy. |

## What they collectively teach the robot-eye app

Your project already has the hardest thing right — **all expression is in the eyes**. These creatures
say *how* to make those eyes not just expressive but **loved**:

1. **Oversize and lower them.** Eyes should feel too big and sit slightly below face-center. (Your
   spec has them at ~48% height — nudge the *visual weight* low; the current design is already close.)
2. **Keep the neutral eye minimal.** Resist detailing the resting face. Detail belongs in the
   *transitions*. The blanker the base, the more people bond with it. (This validates the
   emotion=delta model in doc 02.)
3. **Two-tone the iris (Kirby trick).** A bright-top/deep-bottom gradient gives instant glassy depth —
   you already do an off-center radial; leaning it more two-tone will read cuter.
4. **Make the big catchlight track the viewer.** Bias its position toward the detected person (camera)
   so the eye feels like it's *meeting your eyes*, not just pointing. This is the biggest "it's alive
   and it sees me" upgrade you can make.
5. **Round pupil = the trust switch.** Default round & softly dilated; only narrow/slit for
   angry/alert. Add a **pupil-dilation "warmth" dial** (like Toothless): dilate when engaged/happy,
   contract when focused/alarmed. You already animate `pupil` — wire it to *affection*, not just shock.
6. **EVE is your north star, Baymax your floor.** EVE proves glowing shape-morph eyes reach full
   emotion (aspirational); Baymax proves two dots + roundness already feel warm (your safety net if a
   panel is tiny/low-res).

## The relatability checklist (apply to any eye state)

- [ ] Eyes are *too big* for realism, and sit slightly low → **caregiving reflex**
- [ ] Neutral eye is minimal; complexity lives only in expression changes → **projection**
- [ ] Exactly one dominant highlight, aimed toward the viewer → **living gaze / eye contact**
- [ ] Everything round; angles only for threat states → **safety**
- [ ] Pupil rounded & slightly dilated at rest; dilation tied to warmth → **trust**
- [ ] Readable as a silhouette at thumbnail size → **works at any scale** (Pikachu test)

## One caution: the projection ↔ aliveness trade-off

Hello Kitty (blank) and Grogu (wet, detailed eyes) sit at opposite ends. **Blanker = more
projectable but less "alive"; glossier = more alive but more of a specific "other."** A *companion
robot* wants to feel alive and aware, so lean toward the **Grogu/EVE end** (present highlights, gaze
that meets you) — but keep the *shape* language simple and round like Pikachu so it stays universally
readable. That balance point — **simple round shapes + a living, viewer-aimed highlight** — is the
sweet spot for a relatable robot face.

---
**Sources**
- [Baby schema induces cuteness & caretaking (Glocker et al., 2009) — PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC3260535/)
- [Baby schema modulates the brain reward system — PNAS](https://www.pnas.org/doi/10.1073/pnas.0811620106)
- [Why we think infant animals are cute — phys.org](https://phys.org/news/2015-06-infant-animals-cute.html)
- Scott McCloud, *Understanding Comics* (1993) — iconic abstraction & the "masking effect" (reader identification through simplification)
- [Pikachu design & "expressive neutrality" — CBR](https://www.cbr.com/pokemon-pikachu-best-anime-character/) · [Pikachu design evolution — Pikachu Zone](https://pikachuzone.com/blog/pikachu-design-evolution-generations)
