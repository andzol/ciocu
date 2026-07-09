// Signed session cookie. Set at sign-in (/api/auth) so later requests (e.g. /api/stt-token) know
// who the user is without a fresh Google token every time. Stateless: the cookie IS the record,
// an HMAC-signed { email, sub, exp } payload. Server-only (uses node crypto + AUTH_SECRET).

import { createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE = "ciocu_session";
const MAX_AGE_S = 60 * 60 * 24 * 30; // 30 days
const SECRET = process.env.AUTH_SECRET || "";

interface SessionPayload {
  email: string;
  sub: string;
  exp: number; // epoch seconds
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(data: string): string {
  return createHmac("sha256", SECRET).update(data).digest("base64url");
}

/** Serialize + sign a session for the given user. Returns null if AUTH_SECRET is unset. */
export function createSessionToken(email: string, sub: string, now = Date.now()): string | null {
  if (!SECRET) return null;
  const payload: SessionPayload = { email, sub, exp: Math.floor(now / 1000) + MAX_AGE_S };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

/** Verify a session token; returns the payload or null if invalid/expired/tampered. */
export function readSessionToken(token: string | undefined, now = Date.now()): SessionPayload | null {
  if (!SECRET || !token) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(body);
  // constant-time compare
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
    if (!payload.email || payload.exp * 1000 < now) return null;
    return payload;
  } catch {
    return null;
  }
}

// `Secure` is omitted on plain-http localhost (else the browser drops the cookie in dev).
function secureAttr(secure: boolean): string {
  return secure ? " Secure;" : "";
}

/** Set-Cookie header value for a fresh session. */
export function sessionCookieHeader(token: string, secure: boolean): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly;${secureAttr(secure)} SameSite=Lax; Max-Age=${MAX_AGE_S}`;
}

/** Set-Cookie header value that clears the session. */
export function clearSessionCookieHeader(secure: boolean): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly;${secureAttr(secure)} SameSite=Lax; Max-Age=0`;
}
