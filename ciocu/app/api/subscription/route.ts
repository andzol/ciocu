// Returns the signed-in user's current plan tier, read live from Lemon Squeezy. The client calls
// this to set the usage meter's tier/allowance — so paying flips the meter to basic/pro on the
// next load (no local DB; LS is the source of truth). Anonymous / not-paying → "none" (free).

import type { NextRequest } from "next/server";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth/session-cookie";
import { getSubscriptionTier } from "@/lib/billing/lemonsqueezy";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = readSessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return Response.json({ tier: "none" });
  const tier = await getSubscriptionTier(session.email);
  return Response.json({ tier });
}
