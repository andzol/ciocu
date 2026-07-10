// Cross-device memory sync — a private, per-user store of the memory bundle. Gated behind a
// subscription (free = this-device-only). GET pulls the stored bundle; PUT merges a device's push
// with what's stored (server-side union) so concurrent devices never clobber each other.
//
// Provisioning: set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (Vercel Upstash integration).
// Without them the route returns 503 and the client simply stays local-only.

import type { NextRequest } from "next/server";
import { Redis } from "@upstash/redis";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth/session-cookie";
import { getSubscriptionTier } from "@/lib/billing/lemonsqueezy";
import { mergeBundles, type RawBundle } from "@/lib/memory/mergeBundles";

export const runtime = "nodejs";

function getRedis(): Redis | null {
  // Accept either the native Upstash names or the legacy Vercel KV names — Vercel's integration
  // injects one or the other depending on how the store is created.
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

// Identity + subscription gate. Returns the user's stable key, or a Response to short-circuit.
async function gate(req: NextRequest): Promise<{ key: string } | Response> {
  const session = readSessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return Response.json({ error: "sign in" }, { status: 401 });
  const tier = await getSubscriptionTier(session.email);
  if (tier === "none") return Response.json({ error: "subscription required" }, { status: 402 });
  return { key: `mem:${session.sub}` };
}

export async function GET(req: NextRequest) {
  const db = getRedis();
  if (!db) return Response.json({ error: "sync not configured" }, { status: 503 });
  const g = await gate(req);
  if (g instanceof Response) return g;
  const bundle = await db.get<RawBundle>(g.key);
  return Response.json({ bundle: bundle ?? null });
}

export async function PUT(req: NextRequest) {
  const db = getRedis();
  if (!db) return Response.json({ error: "sync not configured" }, { status: 503 });
  const g = await gate(req);
  if (g instanceof Response) return g;

  let incoming: RawBundle;
  try {
    incoming = (await req.json()) as RawBundle;
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  if (!incoming || incoming.app !== "ciocu" || !Array.isArray(incoming.blocks)) {
    return Response.json({ error: "not a memory bundle" }, { status: 400 });
  }

  const existing = await db.get<RawBundle>(g.key);
  const merged = mergeBundles(existing ?? null, incoming);
  await db.set(g.key, merged);
  return Response.json({ bundle: merged });
}
