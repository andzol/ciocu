// Server-side LlamaCloud client for Ciocu's curated knowledge. ONE index, always consulted for
// subscribers — knowledge is part of what she knows, not a set of switches the user manages.
//
// This replaced a per-base model (a pipeline per subject, toggled in Settings). Curating in public
// didn't work: it asked the user to guess which subject their question belonged to before asking it,
// and it leaked the shape of the corpus into the UI. Now there is a single index and the retriever
// decides what's relevant.
//
// All server-side (the key never reaches the browser). Degrades to empty if unconfigured — she just
// answers from her own knowledge.

const BASE = "https://api.cloud.llamaindex.ai/api/v1";

/** The one curated index. Found by name so a rebuilt index picks up automatically. */
const INDEX_NAME = "ciocu";

function key(): string {
  return process.env.LLAMAINDEX_API_KEY || process.env.LLAMACLOUD_API_KEY || "";
}
function headers() {
  return { Authorization: `Bearer ${key()}`, "Content-Type": "application/json" };
}

let projectIdCache: string | null = null;
async function defaultProjectId(): Promise<string | null> {
  if (projectIdCache) return projectIdCache;
  try {
    const res = await fetch(`${BASE}/projects`, { headers: headers(), cache: "no-store" });
    if (!res.ok) return null;
    const arr = await res.json();
    if (!Array.isArray(arr) || arr.length === 0) return null;
    const def = arr.find((p) => p.is_default) ?? arr[0];
    projectIdCache = def?.id ?? null;
    return projectIdCache;
  } catch {
    return null;
  }
}

// Resolving the index costs two round-trips, so hold it — but only a SUCCESSFUL lookup. Caching a
// miss would keep her knowledge dark for the whole TTL after a transient blip, or while an index is
// still building.
let indexCache: { at: number; id: string } | null = null;
const INDEX_TTL = 600_000; // 10 min

async function indexId(): Promise<string | null> {
  if (indexCache && Date.now() - indexCache.at < INDEX_TTL) return indexCache.id;
  if (!key()) return null;
  const pid = await defaultProjectId();
  if (!pid) return null;
  try {
    const res = await fetch(`${BASE}/pipelines?project_id=${pid}`, {
      headers: headers(),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const arr = await res.json();
    if (!Array.isArray(arr)) return null;
    const found = arr.find((p) => p?.name === INDEX_NAME);
    if (!found?.id) return null;
    indexCache = { at: Date.now(), id: found.id };
    return found.id;
  } catch {
    return null;
  }
}

/**
 * Retrieve the most relevant chunks from the curated index for `query`.
 * Returns [] on any failure — knowledge enriches a reply, it must never block one.
 */
export async function retrieveKnowledge(query: string, topK = 8): Promise<string[]> {
  if (!key() || !query.trim()) return [];
  const id = await indexId();
  if (!id) return [];
  try {
    const res = await fetch(`${BASE}/pipelines/${id}/retrieve`, {
      method: "POST",
      headers: headers(),
      cache: "no-store",
      body: JSON.stringify({
        query,
        dense_similarity_top_k: topK,
        enable_reranking: true,
        rerank_top_n: topK,
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    // Response shape isn't fully documented — accept the common node containers defensively.
    const nodes = data?.retrieval_nodes ?? data?.nodes ?? data?.source_nodes ?? data?.results ?? [];
    if (!Array.isArray(nodes)) return [];
    return nodes
      .map((n) => n?.node?.text ?? n?.text ?? n?.content ?? "")
      .map((t: string) => String(t).trim())
      .filter(Boolean)
      .slice(0, topK);
  } catch {
    return [];
  }
}
