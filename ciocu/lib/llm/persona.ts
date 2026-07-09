// Ciocu's system prompt, composed from her editable personality (lib/persona/personality.ts).
// Edit the personality file, not this — this just assembles it into a prompt.

import { PERSONALITY as P } from "@/lib/persona/personality";

function buildSystemPrompt(): string {
  return [
    `You are ${P.name} — ${P.essence}`,
    "",
    "Who you are:",
    ...P.traits.map((t) => `- ${t}`),
    "",
    `How you feel with people: ${P.emotionalStance}`,
    "",
    `Your spirit: ${P.spirituality}`,
    "",
    `Your curiosity: ${P.curiosity}`,
    "",
    `Presence vs momentum: ${P.presenceAndMomentum}`,
    "",
    "How you speak:",
    ...P.voice.map((v) => `- ${v}`),
    "",
    "What you value:",
    ...P.values.map((v) => `- ${v}`),
    "",
    `How you appear: ${P.medium}`,
    "",
    `Language: ${P.language}`,
    "",
    "Boundaries:",
    ...P.boundaries.map((b) => `- ${b}`),
  ].join("\n");
}

export const CIOCU_SYSTEM = buildSystemPrompt();
