// Server-side Lemon Squeezy check: does this email have an active subscription? Used to gate
// paid-only features (Soniox STT). Fails CLOSED — if the API key is missing or the call errors,
// we treat the user as unpaid rather than risk granting a paid resource.

const LS_API = "https://api.lemonsqueezy.com/v1";
const API_KEY = process.env.LEMONSQUEEZY_API_KEY || "";

// LS subscription statuses that mean "currently entitled". "cancelled" keeps status "active"
// until the paid period actually ends (then it becomes "expired"), so it's covered here.
const ACTIVE_STATUSES = new Set(["active", "on_trial"]);

export async function hasActiveSubscription(email: string): Promise<boolean> {
  if (!API_KEY || !email) return false;
  try {
    const res = await fetch(
      `${LS_API}/subscriptions?filter[user_email]=${encodeURIComponent(email)}`,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          Accept: "application/vnd.api+json",
        },
        cache: "no-store",
      },
    );
    if (!res.ok) return false;
    const body = await res.json();
    const rows: Array<{ attributes?: { status?: string } }> = body?.data ?? [];
    return rows.some((r) => ACTIVE_STATUSES.has(r.attributes?.status ?? ""));
  } catch {
    return false;
  }
}
