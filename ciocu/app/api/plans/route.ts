// The paid plans and what they cost, for the Settings pricing table.
//
// Prices come from Lemon Squeezy on every (cached) read rather than from a constant in the repo:
// LS is what actually charges the customer, so anything we display is a quote and has to match it.
// A hard-coded price is correct only until someone edits the dashboard, and the failure is silent —
// the app keeps advertising a number nobody honours.
//
// Public on purpose: this is a price list, and signed-out visitors are exactly who needs it.

import { getPlanPrices } from "@/lib/billing/lemonsqueezy";

export const runtime = "nodejs";

export async function GET() {
  const plans = await getPlanPrices();
  return Response.json(
    { plans },
    // Prices are the same for everyone, so let the edge hold them briefly too.
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=600" } },
  );
}
