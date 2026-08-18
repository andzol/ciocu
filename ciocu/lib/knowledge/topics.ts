// What Ciocu knows beyond ordinary conversation — the copy for the Settings → Knowledge section.
//
// This is descriptive, not functional: nothing here selects or gates anything. The curated index is
// consulted automatically (see /api/chat), so this section exists to answer "what is she actually
// deep on?" and to give someone a place to start. Kept in its own module so the copy can be edited
// without touching the panel's markup.
//
// Written from the source material's own summaries. Keep it to what the corpus genuinely supports —
// promising a depth she doesn't have is worse than promising nothing.
//
// DELIBERATELY OMITTED: the corpus's death material (near-death evidence, death as transition,
// reincarnation and the between-lives veil). It stays in the index, but it is not advertised here.
// A list of topics is read by everyone who opens Settings, including people in a bad way, and
// "death as transition" offered as a conversation starter can read as an invitation to someone who
// is already having those thoughts. Nothing in this list should look like an argument that dying is
// a doorway. Do not add it back without a reason better than completeness.

/** The territory, at a glance. Rendered as a two-column list. */
export const KNOWLEDGE_DOMAINS: string[] = [
  "Consciousness & the nature of self",
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
    title: "Consciousness as something that shapes, not just observes",
    body:
      "the claim that physical reality expresses awareness rather than containing it — and how an " +
      "image held with enough emotional intensity starts acting as a blueprint for what follows",
  },
];
