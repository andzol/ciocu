// Returns the signed-in user's plan tier, next renewal date, and this period's top-up credits, read
// live from the payment provider. The client calls this to size the usage meter (allowance = tier + top-ups)
// and show when it renews — so paying or topping up updates the meter on the next load (no local DB;
// the provider is the source of truth). Signed in but not paying → "none" (free), no renewal, no top-ups.
//
// NO valid session is a 401, NOT a "none". Those two used to share one 200 response, which the client
// could not tell apart: a user whose cookie had lapsed was quietly written down to Free and stayed
// there through every refresh, because only an explicit sign-out/in ever minted a new cookie. The
// client now re-authenticates on a 401 instead of believing it (see app/page.tsx).
//
// This route is also where the session slides: it's called on mount and on every focus, which makes
// it the app's natural heartbeat, so a returning user's cookie is renewed long before it can lapse.

import type { NextRequest } from "next/server";
import {
  readSessionToken,
  createSessionToken,
  sessionCookieHeader,
  shouldRefreshSession,
  SESSION_COOKIE,
} from "@/lib/auth/session-cookie";
import { getSubscriptionInfo } from "@/lib/billing/provider";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = readSessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    return Response.json({ error: "no session" }, { status: 401 });
  }

  const info = await getSubscriptionInfo(session.email);

  const headers = new Headers({ "Content-Type": "application/json" });
  if (shouldRefreshSession(session)) {
    const token = createSessionToken(session.email, session.sub);
    if (token) {
      headers.append("Set-Cookie", sessionCookieHeader(token, req.nextUrl.protocol === "https:"));
    }
  }
  return new Response(JSON.stringify(info), { headers });
}
