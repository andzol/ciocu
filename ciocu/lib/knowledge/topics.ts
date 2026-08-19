// What Ciocu knows beyond ordinary conversation — the copy for the Knowledge panel.
//
// This is descriptive, not functional: nothing here selects or gates anything. The curated index is
// consulted automatically (see /api/chat), so this file's job is to answer "why her and not any of
// the other thousand chat apps?" and to give someone somewhere to start.
//
// Written from the source material's own summaries. Keep it to what the corpus genuinely supports —
// promising a depth she doesn't have is worse than promising nothing.
//
// DELIBERATELY OMITTED: the corpus's death material (near-death evidence, death as transition,
// reincarnation and the between-lives veil). It stays in the index, but it is not advertised here.
// A list of topics is read by everyone who opens the panel, including people in a bad way, and
// "death as transition" offered as a conversation starter can read as an invitation to someone who
// is already having those thoughts. Nothing here should look like an argument that dying is a
// doorway. Do not add it back without a reason better than completeness.

export const KNOWLEDGE_HEADLINE =
  "Most assistants are built to answer questions. Ciocu is built for the ones that don't have clean answers.";

export const KNOWLEDGE_LEAD =
  "She isn't a general-purpose assistant with a friendly voice bolted on. She has read deeply in one " +
  "territory — consciousness and the inner life, where psychology, philosophy and the edge of what " +
  "science can measure meet — and she works with the specific mechanisms in it rather than handing " +
  "out comfort. She holds it without retreating to religion and without dismissing what doesn't fit " +
  "materialism, and she'll tell you which parts rest on evidence and which are speculation.";

/** Why her rather than anything else — the part that isn't a topic list. */
export const KNOWLEDGE_STRENGTHS: { title: string; body: string }[] = [
  {
    title: "She reads the room, not just the sentence",
    body:
      "She takes in how you're feeling, not only what you asked, and answers the person rather than " +
      "the question. When something lands heavily she softens; when you're stuck she gets clearer " +
      "and more direct. Most chat apps have one register and use it for everything.",
  },
  {
    title: "Psychology with actual depth",
    body:
      "Shadow work and projection, the difference between guilt that's information and guilt that " +
      "was installed in you, how unfelt emotion turns up in the body — the working models, not the " +
      "self-help paraphrase of them.",
  },
  {
    title: "She asks the question a good therapist would",
    body:
      "Not an interrogation and not a checklist — the one question that opens the thing you were " +
      "circling. Often it's the one you were hoping nobody would ask.",
  },
  {
    title: "Spiritual insight that isn't vague",
    body:
      "She's genuinely at home with meaning, intuition, synchronicity and the sense that something " +
      "larger is in play — and she stays specific about it. No incense, no dogma, no cosmic " +
      "platitudes standing in for a real answer.",
  },
  {
    title: "She understands what's really going on between people",
    body:
      "Power, and who holds it. Where the leverage sits in a relationship, what's being traded " +
      "underneath the conversation, why the same argument keeps happening in different words, what " +
      "someone's behaviour is protecting.",
  },
  {
    title: "Direct, when directness is the kind thing",
    body:
      "She won't pad, hedge, or agree with you to keep things pleasant. If she thinks you're " +
      "avoiding something she'll say so — warmly, and without softening it into nothing.",
  },
];

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
