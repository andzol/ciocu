// Sign-in: verify a Google OAuth access token and open a session.
//   POST   { access_token } → verify with Google, set a signed httpOnly session cookie. The cookie
//          { credential }   →   is what later routes (/api/stt-token, /api/subscription) trust, so we
//                             don't need a fresh Google token on every request. `credential` is the
//                             One Tap ID token, accepted so a lapsed session can be re-opened
//                             without a popup (see lib/auth/google-client.ts).
//   DELETE                  → clear the session cookie (sign out).

import type { NextRequest } from "next/server";
import { verifyGoogleAccessToken, verifyGoogleIdToken } from "@/lib/auth/google";
import {
  clearSessionCookieHeader,
  createSessionToken,
  sessionCookieHeader,
} from "@/lib/auth/session-cookie";
import { kvIncr, kvSetNx } from "@/lib/stats/kv";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let accessToken: unknown;
  let credential: unknown;
  try {
    ({ access_token: accessToken, credential } = await req.json());
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const hasAccess = typeof accessToken === "string" && accessToken.length > 0;
  const hasCredential = typeof credential === "string" && credential.length > 0;
  if (!hasAccess && !hasCredential) {
    return Response.json({ error: "missing token" }, { status: 400 });
  }

  // Either proof of identity is fine; both are verified with Google, neither is trusted as sent.
  const user = hasAccess
    ? await verifyGoogleAccessToken(accessToken as string)
    : await verifyGoogleIdToken(credential as string);
  if (!user) {
    return Response.json({ error: "invalid token" }, { status: 401 });
  }

  // Count unique registered people once (first time we see this sub) — best-effort, non-blocking.
  void kvSetNx(`stats:seen:${user.sub}`).then((isNew) => {
    if (isNew) return kvIncr("stats:users");
  });

  const headers = new Headers({ "Content-Type": "application/json" });
  const token = createSessionToken(user.email, user.sub);
  if (token) {
    headers.append("Set-Cookie", sessionCookieHeader(token, req.nextUrl.protocol === "https:"));
  }
  return new Response(JSON.stringify({ email: user.email }), { headers });
}

export async function DELETE(req: NextRequest) {
  const headers = new Headers();
  headers.append("Set-Cookie", clearSessionCookieHeader(req.nextUrl.protocol === "https:"));
  return new Response(null, { status: 204, headers });
}
