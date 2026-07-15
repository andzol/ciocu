// Tiny wrapper over the Vercel KV / Upstash Redis REST API for global social-proof counters.
// These are the first cross-user aggregates (everything else is per-user), so they need one shared
// store. Uses the REST endpoint via fetch — no extra dependency. FAIL-SAFE: if KV isn't configured
// (env unset) or a call errors, reads return 0 and writes no-op, so nothing breaks pre-provision.
//
// Provision: Vercel dashboard → Storage → create a KV/Upstash store, connect it to the project.
// That injects KV_REST_API_URL + KV_REST_API_TOKEN automatically.

const BASE = process.env.KV_REST_API_URL || "";
const TOKEN = process.env.KV_REST_API_TOKEN || "";

async function run(command: string): Promise<string | number | null> {
  if (!BASE || !TOKEN) return null;
  try {
    const res = await fetch(`${BASE}/${command}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.result ?? null;
  } catch {
    return null;
  }
}

/** Atomically increment a counter. */
export function kvIncr(key: string): Promise<string | number | null> {
  return run(`incr/${key}`);
}

/** Read a counter as a number (0 if missing/unset). */
export async function kvGetNumber(key: string): Promise<number> {
  const v = await run(`get/${key}`);
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : 0;
  return Number.isFinite(n) ? n : 0;
}

/** Set key only if absent; returns true if it was newly set (i.e. first time we've seen it). */
export async function kvSetNx(key: string, value = "1"): Promise<boolean> {
  const r = await run(`setnx/${key}/${value}`);
  return r === 1 || r === "1";
}
