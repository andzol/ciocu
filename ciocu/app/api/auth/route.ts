// Verifies a Google Identity Services credential (JWT) server-side and returns the trusted
// profile. This is what turns "login as decoration" into real identity: the browser can put
// anything in localStorage, but only a token Google actually signed — and minted for OUR
// client id — passes here. That matters the moment money is attached to an email.
//
// No client secret needed: verifying an ID token only requires checking Google's signature and
// that the token's audience is our client id. We use Google's tokeninfo endpoint so there's no
// extra dependency.

import type { NextRequest } from "next/server";

export const runtime = "nodejs";

// Server may set GOOGLE_CLIENT_ID; otherwise reuse the public one (same value, the client id).
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

export async function POST(req: NextRequest) {
  if (!CLIENT_ID) {
    return Response.json({ error: "auth not configured" }, { status: 500 });
  }

  let credential: unknown;
  try {
    ({ credential } = await req.json());
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  if (typeof credential !== "string" || !credential) {
    return Response.json({ error: "missing credential" }, { status: 400 });
  }

  // Ask Google to validate the token and hand back its claims.
  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
    { cache: "no-store" },
  );
  if (!res.ok) {
    return Response.json({ error: "invalid token" }, { status: 401 });
  }
  const data = await res.json();

  // The token must have been minted for THIS app, and the email must be verified by Google.
  if (data.aud !== CLIENT_ID) {
    return Response.json({ error: "wrong audience" }, { status: 401 });
  }
  const emailVerified = data.email_verified === true || data.email_verified === "true";
  if (!emailVerified || !data.email) {
    return Response.json({ error: "email not verified" }, { status: 401 });
  }

  return Response.json({
    sub: data.sub,
    name: data.name,
    email: data.email,
    picture: data.picture,
  });
}
