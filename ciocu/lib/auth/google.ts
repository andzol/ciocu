// Server-side verification of a Google Identity Services credential (JWT). Shared by /api/auth
// and /api/stt-token so identity is checked the same way everywhere. Verifies via Google's
// tokeninfo endpoint: only a token Google signed, minted for OUR client id, with a verified
// email, passes. No client secret needed.

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

export interface VerifiedGoogleUser {
  sub: string;
  email: string;
  name: string;
  picture: string;
}

export async function verifyGoogleCredential(credential: string): Promise<VerifiedGoogleUser | null> {
  if (!CLIENT_ID || !credential) return null;
  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.aud !== CLIENT_ID) return null;
    const emailVerified = data.email_verified === true || data.email_verified === "true";
    if (!emailVerified || !data.email) return null;
    return { sub: data.sub, email: data.email, name: data.name, picture: data.picture };
  } catch {
    return null;
  }
}
