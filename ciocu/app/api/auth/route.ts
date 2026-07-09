// Sign-in: verify a Google credential and open a session.
//   POST   { credential }  → verify with Google, set a signed httpOnly session cookie, return the
//                            trusted profile. The cookie is what later routes (/api/stt-token)
//                            trust, so we don't need a fresh Google token on every request.
//   DELETE                 → clear the session cookie (sign out).

import type { NextRequest } from "next/server";
import { verifyGoogleCredential } from "@/lib/auth/google";
import {
  clearSessionCookieHeader,
  createSessionToken,
  sessionCookieHeader,
} from "@/lib/auth/session-cookie";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let credential: unknown;
  try {
    ({ credential } = await req.json());
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  if (typeof credential !== "string" || !credential) {
    return Response.json({ error: "missing credential" }, { status: 400 });
  }

  const user = await verifyGoogleCredential(credential);
  if (!user) {
    return Response.json({ error: "invalid token" }, { status: 401 });
  }

  const headers = new Headers({ "Content-Type": "application/json" });
  const token = createSessionToken(user.email, user.sub);
  if (token) {
    headers.append("Set-Cookie", sessionCookieHeader(token, req.nextUrl.protocol === "https:"));
  }
  return new Response(
    JSON.stringify({ sub: user.sub, name: user.name, email: user.email, picture: user.picture }),
    { headers },
  );
}

export async function DELETE(req: NextRequest) {
  const headers = new Headers();
  headers.append("Set-Cookie", clearSessionCookieHeader(req.nextUrl.protocol === "https:"));
  return new Response(null, { status: 204, headers });
}
