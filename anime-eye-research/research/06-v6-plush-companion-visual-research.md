# 06 - v6 Plush Companion Eye Visual Research

Goal: make a sixth candidate that feels more lovable than v4 without becoming human, uncanny,
or a direct copy of any existing character.

## Visual References Collected

| Reference | What I looked for | What v6 borrows |
|---|---|---|
| [LOVOT technology](https://lovot.life/en/technology/) | Layered display eyes, purposeful blinking, pupil width, and gaze return. | More layered depth: iris body, dark pupil, lower reflection, sparkle, and tiny secondary catchlight. |
| [LOVOT - Robots Guide](https://robotsguide.com/robots/lovot) | A companion robot with large eyes, soft proportions, and eye contact as the social anchor. | Big eye-to-face ratio, non-threatening spacing, and a rounded silhouette. |
| [Big Hero 6 / Baymax design notes](https://en.wikipedia.org/wiki/Big_Hero_6_%28film%29) | Extreme serenity from simple, low-detail face geometry. | Calm minimalism and no mouth. v6 does not copy Baymax's dot-line face. |
| [WIRED on robots that seem human but not too human](https://www.wired.com/2017/01/touchy-task-making-robots-seem-human-not-human/) | Avoiding over-anthropomorphism and tuning eyes by tiny proportions. | Keep it a screen companion, not a human face: no nose, mouth, eyebrows, skin, or realistic sclera. |
| [RoboEyes library](https://github.com/FluxGarage/RoboEyes) | Smooth morphing robot eye shapes on small displays. | Expressions remain parameterized: openness, bend, tilt, pupil, gaze, glow. |
| Visual image-search pass: cute anime eyes, robot expression sheets, kawaii eye highlights | Beautiful eye construction: big dark center, one dominant highlight, lower bounce glow, small secondary glints. | Larger round pupil, warmer lower reflection, calmer star sparkle, and softer lens outline. |

## Shape Decisions

- Wider, closer eyes: reads younger and safer than the taller v4 lens.
- Larger round pupil: "trust dial" stays open by default; surprise no longer shrinks to a pinprick.
- Softer cyan/teal palette: less scanner-like, more companion-screen-like.
- One dominant catchlight plus two tiny helpers: enough life without a cluttered anime face.
- Warm lower reflection: a small peach-gold bounce inside the dark pupil makes the eye feel gentler.
- Fewer sparkles: v4's gloss was strong; v6 should feel quieter and more huggable.
- No mouth, nose, brows, or human skin: keeps it out of uncanny-valley territory.

## v6 Implementation Notes

- Candidate file: `prototype/candidates/v6-plush-companion.html`
- Live app renderer: `ciocu/lib/eyes/engine.ts`
- Live app presets: `ciocu/lib/eyes/presets.ts`

The important change is not "more detail"; it is better detail placement. The resting face remains
simple, but the dark pupil and catchlights now carry more warmth.
