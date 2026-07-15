// Public global stats for social proof on the landing page: total registered people and total
// messages heard (→ approx hours). Read from the shared KV counters (incremented in /api/auth and
// /api/chat). No auth; numbers are aggregate, not per-user.

import { kvGetNumber } from "@/lib/stats/kv";

export const runtime = "nodejs";

// Rough "time spent together" per exchange, to turn a message count into a warm "hours" figure.
const SECONDS_PER_EXCHANGE = 40;

export async function GET() {
  const [users, messages] = await Promise.all([
    kvGetNumber("stats:users"),
    kvGetNumber("stats:messages"),
  ]);
  const hours = Math.round((messages * SECONDS_PER_EXCHANGE) / 3600);
  return Response.json(
    { users, messages, hours },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}
