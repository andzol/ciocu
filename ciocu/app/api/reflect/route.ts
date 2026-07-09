// Distill durable memories about the user from a recent exchange. Returns a small JSON array of
// memory blocks; the client embeds + stores them locally. Cheap non-streaming deepseek-flash call.

import type { NextRequest } from "next/server";

export const runtime = "nodejs";

const MODEL = process.env.OPENROUTER_MODEL || "deepseek/deepseek-v4-flash";
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

const SYSTEM = `You distill durable memories about the USER from a conversation, for a companion who wants to remember what matters to them over time.
Extract only things worth remembering long-term: facts about their life, preferences, relationships, ongoing situations, and meaningful feelings. Ignore small talk, greetings, and the assistant's own words.
Reply with ONLY a compact JSON array, no prose. Each item: {"content": "<concise third-person statement>", "kind": "episodic" | "semantic" | "affective"}.
- semantic: stable facts or preferences ("User is a graphic designer", "User loves the sea")
- episodic: something that happened or was discussed ("User got a job offer at a startup")
- affective: a meaningful feeling or state ("User has been anxious about turning 40")
Return [] if there is nothing worth remembering.`;

interface Msg { role: "user" | "assistant"; content: string }
interface Block { content: string; kind: "episodic" | "semantic" | "affective" }

function parseBlocks(text: string): Block[] {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end <= start) return [];
  try {
    const arr = JSON.parse(text.slice(start, end + 1));
    if (!Array.isArray(arr)) return [];
    return arr
      .filter(
        (x) =>
          x &&
          typeof x.content === "string" &&
          x.content.trim() &&
          ["episodic", "semantic", "affective"].includes(x.kind),
      )
      .slice(0, 4)
      .map((x) => ({ content: String(x.content).trim(), kind: x.kind }));
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return Response.json({ blocks: [] });

  let messages: Msg[];
  try {
    ({ messages } = await req.json());
  } catch {
    return Response.json({ blocks: [] });
  }

  try {
    const upstream = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://ciocu.vercel.app",
        "X-Title": "Ciocu",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "system", content: SYSTEM }, ...messages.slice(-8)],
        stream: false,
        temperature: 0,
        max_tokens: 400,
        reasoning: { enabled: false },
      }),
    });
    if (!upstream.ok) return Response.json({ blocks: [] });
    const data = await upstream.json();
    const msg = data.choices?.[0]?.message ?? {};
    const text = `${msg.content ?? ""}\n${msg.reasoning ?? ""}`;
    return Response.json({ blocks: parseBlocks(text) });
  } catch {
    return Response.json({ blocks: [] });
  }
}
