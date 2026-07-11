// Server-side LlamaCloud client for curated Knowledge packs. Lists the user's pipelines (each = a
// knowledge base) and retrieves relevant chunks for a query. All server-side (the key never
// reaches the browser). Degrades to empty if unconfigured.

const BASE = "https://api.cloud.llamaindex.ai/api/v1";

function key(): string {
  return process.env.LLAMAINDEX_API_KEY || process.env.LLAMACLOUD_API_KEY || "";
}
function headers() {
  return { Authorization: `Bearer ${key()}`, "Content-Type": "application/json" };
}

export interface KnowledgeBase {
  id: string;
  name: string;
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

/** Every pipeline in the account = an available knowledge base. */
export async function listPipelines(): Promise<KnowledgeBase[]> {
  if (!key()) return [];
  const pid = await defaultProjectId();
  if (!pid) return [];
  try {
    const res = await fetch(`${BASE}/pipelines?project_id=${pid}`, {
      headers: headers(),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const arr = await res.json();
    return Array.isArray(arr) ? arr.map((p) => ({ id: p.id, name: p.name })).filter((p) => p.id) : [];
  } catch {
    return [];
  }
}

/** Retrieve the most relevant chunk texts from one pipeline for a query. */
export async function retrieve(pipelineId: string, query: string, topK = 4): Promise<string[]> {
  if (!key() || !query.trim()) return [];
  try {
    const res = await fetch(`${BASE}/pipelines/${pipelineId}/retrieve`, {
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
    // Response shape not fully documented — accept the common node containers defensively.
    const nodes =
      data?.retrieval_nodes ?? data?.nodes ?? data?.source_nodes ?? data?.results ?? [];
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
