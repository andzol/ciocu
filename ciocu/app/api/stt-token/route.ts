// Mints a short-lived Soniox key for the browser — but ONLY for a signed-in, paying user.
// This is the security boundary: the permanent Soniox key never leaves the server, and a
// non-subscriber can never obtain a key to spend against your Soniox balance.
//
//   session cookie  → who they are (verified at sign-in)
//   Lemon Squeezy   → are they currently paying?
//   Soniox          → mint a single-use, time-boxed temporary key
//
// Any failure (no session, not paid, missing config) → 401/403, and the client falls back to the
// free Web Speech path.

import type { NextRequest } from "next/server";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth/session-cookie";
import { hasActiveSubscription } from "@/lib/billing/lemonsqueezy";

export const runtime = "nodejs";

const SONIOX_MINT = "https://api.soniox.com/v1/auth/temporary-api-key";
const MODEL = "stt-rt-v5";
const KEY_TTL_S = 3600; // key can open streams for up to an hour
const MAX_SESSION_S = 900; // ...each stream capped at 15 min to bound cost

export async function POST(req: NextRequest) {
  const key = process.env.SONIOX_API_KEY;
  if (!key) return Response.json({ error: "stt not configured" }, { status: 503 });

  // 1) Who is this? (signed session cookie set at sign-in)
  const session = readSessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return Response.json({ error: "sign in required" }, { status: 401 });

  // 2) Are they paying?
  const paid = await hasActiveSubscription(session.email);
  if (!paid) return Response.json({ error: "subscription required" }, { status: 403 });

  // 3) Mint a temporary, single-use, time-boxed key.
  try {
    const res = await fetch(SONIOX_MINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        usage_type: "transcribe_websocket",
        expires_in_seconds: KEY_TTL_S,
        max_session_duration_seconds: MAX_SESSION_S,
        client_reference_id: session.email, // shows in Soniox usage logs for per-user reconciliation
      }),
      cache: "no-store",
    });
    if (!res.ok) return Response.json({ error: "mint failed" }, { status: 502 });
    const data = await res.json();
    const apiKey = data.api_key ?? data.temporary_api_key ?? data.key;
    if (!apiKey) return Response.json({ error: "mint failed" }, { status: 502 });
    return Response.json({ apiKey, model: MODEL, expiresInSeconds: KEY_TTL_S });
  } catch {
    return Response.json({ error: "mint failed" }, { status: 502 });
  }
}
