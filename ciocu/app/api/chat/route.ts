// Serverless proxy to OpenRouter. The API key lives here (server-side) and never reaches the
// browser bundle. Streams the model's reply back as plain-text token deltas.

import type { NextRequest } from "next/server";

export const runtime = "nodejs";

const MODEL = process.env.OPENROUTER_MODEL || "deepseek/deepseek-v4-flash";
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return new Response("Ciocu is missing her API key (OPENROUTER_API_KEY).", { status: 500 });

  let messages: ChatMessage[];
  try {
    ({ messages } = await req.json());
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response("No messages", { status: 400 });
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
