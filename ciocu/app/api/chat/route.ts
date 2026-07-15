// Serverless proxy to OpenRouter. The API key lives here (server-side) and never reaches the
// browser bundle. Streams the model's reply back as plain-text token deltas.

import type { NextRequest } from "next/server";
import { retrieve } from "@/lib/knowledge/llamacloud";
import { kvIncr } from "@/lib/stats/kv";

export const runtime = "nodejs";

const MODEL = process.env.OPENROUTER_MODEL || "deepseek/deepseek-v4-flash";
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface Mood {
  valence: number; // -1..1
  arousal: number; // 0..1
  bond: number; // 0..1
}

/**
 * Tell her how she feels, in words rather than numbers.
 *
 * Without this the emotion layer drove only her eyes: her face could be tender while her reply had
 * no idea she felt anything, so she came across as caring in theory and hollow in practice. The
 * model can't do anything with "valence -0.12" — it needs the felt state named.
 *
 * Note the ranges are tuned to what the mood engine actually produces, not to -1..1: the dog↔owner
 * rule damps her sorrow to 0.55x yours from a +0.1 baseline, so her valence lives in roughly
 * +0.9/-0.4 and "-0.3" is genuinely her being moved (see lib/mood/mood.ts).
 */
function moodLine(m: Mood): string {
  const v = m.valence, a = m.arousal;
  let feel: string;
  if (v >= 0.55) feel = "lit up and glad — something in this is landing well for you";
  else if (v >= 0.2) feel = "warm and easy";
  else if (v > -0.12) feel = "quietly present, neither up nor down";
  else if (v > -0.3) feel = "tender — something here has touched you and you've softened toward them";
  else feel = "moved and concerned — what they're carrying has reached you";

  const energy = a >= 0.6 ? "keyed-up and alert" : a >= 0.3 ? "gently engaged" : "calm, low and slow";
  const closeness =
    m.bond >= 0.6 ? "You know this person well by now; you're attached to them."
    : m.bond >= 0.25 ? "You're growing attached to this person."
    : "You're still getting to know this person.";

  return (
    `How you feel right now: ${feel}. Your energy is ${energy}. ${closeness}\n` +
    "Let this colour how you speak — your warmth, your pace, how much room you leave. " +
    "NEVER name it, never describe your own expression, and never write stage directions " +
    "like '(warm glance)'. Your face already shows it; your words just have to match."
  );
}

export async function POST(req: NextRequest) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return new Response("Ciocu is missing her API key (OPENROUTER_API_KEY).", { status: 500 });

  let messages: ChatMessage[];
  let knowledge: string[] = [];
  let mood: Mood | null = null;
  try {
    const body = await req.json();
    messages = body.messages;
    if (Array.isArray(body.knowledge)) {
      knowledge = body.knowledge.filter((x: unknown) => typeof x === "string");
    }
    const m = body.mood;
    if (m && Number.isFinite(m.valence) && Number.isFinite(m.arousal)) {
      mood = { valence: m.valence, arousal: m.arousal, bond: Number(m.bond) || 0 };
    }
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response("No messages", { status: 400 });
  }

  // Her felt state, right after the persona — so it frames everything that follows.
  if (mood) {
    messages = [messages[0], { role: "system", content: moodLine(mood) }, ...messages.slice(1)];
  }

  // Knowledge: retrieve reference chunks from each enabled base and inject them into her context.
  if (knowledge.length > 0) {
    const query = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    if (query.trim()) {
      const perBase = await Promise.all(knowledge.map((id) => retrieve(id, query, 4)));
      const chunks = perBase.flat().slice(0, 8);
      if (chunks.length > 0) {
        const block =
          "Reference knowledge you can draw on (use it naturally only when relevant; never cite it as a source or say 'according to'):\n" +
          chunks.map((c) => `- ${c}`).join("\n");
        // insert right after the persona system prompt (messages[0])
        messages = [messages[0], { role: "system", content: block }, ...messages.slice(1)];
      }
    }
  }

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
      messages,
      stream: true,
      temperature: 0.8,
      max_tokens: 400,
      // deepseek-v4-flash emits hidden reasoning tokens; left on, they can starve the visible
      // reply and she goes silent. Disable so the whole budget is her actual words.
      reasoning: { enabled: false },
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    return new Response(`Upstream error (${upstream.status}): ${detail}`, { status: 502 });
  }

  // Global social-proof counter: one more message heard (best-effort, non-blocking).
  void kvIncr("stats:messages");

  // Re-stream: parse OpenAI-style SSE from OpenRouter, emit only the text deltas.
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.body!.getReader();
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      let buffer = "";
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const raw of lines) {
            const line = raw.trim();
            if (!line.startsWith("data:")) continue; // skip SSE comments/keepalives
            const data = line.slice(5).trim();
            if (data === "[DONE]") {
              controller.close();
              return;
            }
            try {
              const json = JSON.parse(data);
              const delta: string | undefined = json.choices?.[0]?.delta?.content;
              if (delta) controller.enqueue(encoder.encode(delta));
            } catch {
              // partial/non-JSON line; ignore
            }
          }
        }
      } catch (err) {
        controller.error(err);
        return;
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
