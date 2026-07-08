// Light emotion read: given the recent conversation, return the USER's emotional tone as
// {valence, arousal}. Cheap non-streaming call (deepseek-v4-flash) so Ciocu can react in the
// moment. Separate from /api/chat so reply quality stays clean.

import type { NextRequest } from "next/server";

export const runtime = "nodejs";

const MODEL = process.env.OPENROUTER_MODEL || "deepseek/deepseek-v4-flash";
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

const SYSTEM =
  "You read emotional tone. Given a short conversation, judge how the USER (not the assistant) " +
  "feels in their latest message. Reply with ONLY compact JSON, no prose: " +
  '{"valence": <number -1..1>, "arousal": <number 0..1>}. ' +
  "valence: -1 very negative/sad/upset, 0 neutral, +1 very positive/happy. " +
  "arousal: 0 calm/flat, 1 highly activated/intense.";

interface Msg { role: "user" | "assistant"; content: string }

function parseEmotion(text: string): { valence: number; arousal: number } {
  // Find the JSON object that actually holds the emotion (content or reasoning may carry musing).
  const match = text.match(/\{[^{}]*valence[^{}]*\}/i);
  if (match) {
    try {
      const j = JSON.parse(match[0]);
      const v = Number(j.valence);
      const a = Number(j.arousal);
      if (Number.isFinite(v) && Number.isFinite(a)) {
        return { valence: Math.max(-1, Math.min(1, v)), arousal: Math.max(0, Math.min(1, a)) };
      }
    } catch {
      /* fall through */
    }
  }
  return { valence: 0, arousal: 0.15 };
}

export async function POST(req: NextRequest) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return Response.json({ valence: 0, arousal: 0.15 });

  let messages: Msg[];
  try {
    ({ messages } = await req.json());
  } catch {
    return Response.json({ valence: 0, arousal: 0.15 });
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
        messages: [{ role: "system", content: SYSTEM }, ...messages.slice(-6)],
        stream: false,
        temperature: 0,
        max_tokens: 300, // room so the JSON isn't truncated behind the model's reasoning tokens
        reasoning: { enabled: false }, // try to skip reasoning (faster/cheaper); harmless if ignored
      }),
    });
    if (!upstream.ok) return Response.json({ valence: 0, arousal: 0.15 });
    const data = await upstream.json();
    const msg = data.choices?.[0]?.message ?? {};
    const text = `${msg.content ?? ""}\n${msg.reasoning ?? ""}`; // JSON may land in either field
    return Response.json(parseEmotion(text));
  } catch {
    return Response.json({ valence: 0, arousal: 0.15 });
  }
}
