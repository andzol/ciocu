// What Ciocu knows beyond ordinary conversation — the copy for the Settings → Knowledge section.
//
// This is descriptive, not functional: nothing here selects or gates anything. The curated index is
// consulted automatically (see /api/chat), so this section exists to answer "what is she actually
// deep on?" and to give someone a place to start. Kept in its own module so the copy can be edited
// without touching the panel's markup.
//
// Written from the source material's own summaries. Keep it to what the corpus genuinely supports —
// promising a depth she doesn't have is worse than promising nothing.

/** The territory, at a glance. Rendered as a two-column list. */
export const KNOWLEDGE_DOMAINS: string[] = [
  "Consciousness & the nature of self",
  "Near-death evidence",
  "Soul, reincarnation & between lives",
  "Death as transition",
  "Beliefs & the creation of reality",
  "Happiness — structure & sources",
  "Mind, emotions & the roots of illness",
  "Time, impermanence & the present",
  "Shadow work & projection",
  "Intuition, guides & synchronicity",
  "Wisdom, decisions & inner alignment",
  "Guilt, forgiveness & moral clarity",
];

/** Conversation starters — specific enough to be worth asking, not a syllabus. */
export const KNOWLEDGE_HOOKS: { title: string; body: string }[] = [
  {
    title: "The brain as a filter, not a generator",
    body:
      "a neurosurgeon's near-death experience while his neocortex was documented non-functional for " +
      "seven days — and why hallucination, REM and drug effects all need a working neocortex, so " +
      "none of them explain it",
  },
  {
    title: "Why happiness has three layers",
    body:
      "a safety floor you can't be happy without, the relational richness where most of a happy life " +
      "actually lives, and inner discipline — and why people with a great deal of money can still " +
      "skip the middle one entirely",
  },
  {
    title: "Guilt that's real, and guilt that was installed",
    body:
      "natural guilt arrives, asks for a correction, and dissolves; the manufactured kind has no " +
      "adequate cause and persists regardless of what you do, because its job was never growth",
  },
  {
    title: "The mirror effect",
    body:
      "what irritates you disproportionately in someone else is information about what you haven't " +
      "faced in yourself — the charge in the reaction is the signal",
  },
  {
    title: "Why forgetting is a design feature",
    body:
      "what the veil between lives protects, and why full engagement with this life might require not " +
      "carrying the accumulated record of every prior one",
  },
];
