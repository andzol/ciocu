// Server-side verification of a Google Identity Services credential (JWT). Shared by /api/auth
// and /api/stt-token so identity is checked the same way everywhere. Verifies via Google's
// tokeninfo endpoint: only a token Google signed, minted for OUR client id, with a verified
// email, passes. No client secret needed.

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

export interface VerifiedGoogleUser {
  sub: string;
  email: string;
}

/**
 * Verify a Google OAuth **access token** (from the client's token flow): confirm Google issued it
 * for OUR client and it carries a verified email. tokeninfo returns azp/aud (the client id),
 * scope, email and email_verified for a valid token.
 */
export async function verifyGoogleAccessToken(accessToken: string): Promise<VerifiedGoogleUser | null> {
  if (!CLIENT_ID || !accessToken) return null;
  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const data = await res.json();
    // The token must have been minted for THIS app (azp for user tokens; aud as a fallback).
    if (data.azp !== CLIENT_ID && data.aud !== CLIENT_ID) return null;
    const emailVerified = data.email_verified === true || data.email_verified === "true";
    if (!emailVerified || !data.email) return null;
    return { sub: data.sub, email: data.email };
  } catch {
    return null;
  }
}
