// Returns the signed-in user's plan tier, next renewal date, and this period's top-up credits, read
// live from Lemon Squeezy. The client calls this to size the usage meter (allowance = tier + top-ups)
// and show when it renews — so paying or topping up updates the meter on the next load (no local DB;
// LS is the source of truth). Anonymous / not-paying → "none" (free), no renewal, no top-ups.

import type { NextRequest } from "next/server";
import { readSessionToken, SESSION_COOKIE } from "@/lib/auth/session-cookie";
import { getSubscriptionInfo } from "@/lib/billing/lemonsqueezy";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = readSessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return Response.json({ tier: "none", renewsAt: null, topupCredits: 0 });
  const info = await getSubscriptionInfo(session.email);
  return Response.json(info);
}
