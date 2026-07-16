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

// Bases withheld from the app entirely, by pipeline slug. Not a UI preference — a base listed here
// is unavailable everywhere: it never reaches the Settings list AND /api/chat refuses to retrieve
// from it, so a client that still has its id (already toggled on, stored in localStorage) gets
// nothing. Hiding it in the UI alone would leave the material shaping her replies.
//
// ciocu-sexual-psychology: withheld pending the legal framework to publish adult material
// (age assurance, jurisdiction rules). The pipeline and its 18+/(i) plumbing stay intact — remove
// the slug here to bring it back.
//
// ⚠ Before un-hiding: enabled base ids persist in localStorage (lib/knowledge/enabled.ts), so anyone
// who had this on before it was hidden will have it silently switched back on the moment the slug
// goes — no age check, no consent, no notice. That's the wrong way for adult material to return.
// Whatever gate the legal framework requires must run BEFORE the id is honoured again.
const HIDDEN_BASES = new Set(["ciocu-sexual-psychology"]);

let visibleCache: { at: number; bases: KnowledgeBase[] } | null = null;
const VISIBLE_TTL = 60_000;

/**
 * The pipelines the app is allowed to use. Single source of truth for both the Settings list and
 * the retrieval gate, so the two can't drift apart.
 *
 * A failed/empty listing isn't cached: caching it would keep knowledge dark for a full TTL after a
 * transient LlamaCloud blip, and an empty list is exactly what makes the gate fail closed.
 */
export async function visiblePipelines(): Promise<KnowledgeBase[]> {
  if (visibleCache && Date.now() - visibleCache.at < VISIBLE_TTL) return visibleCache.bases;
  const bases = (await listPipelines()).filter((p) => !HIDDEN_BASES.has(p.name));
  if (bases.length > 0) visibleCache = { at: Date.now(), bases };
  return bases;
}

/**
 * Drop any base the app won't serve. Fails CLOSED: if the pipeline list is unavailable we retrieve
 * from nothing rather than risk honouring a hidden id — she simply answers without knowledge.
 */
export async function allowedBaseIds(requested: string[]): Promise<string[]> {
  if (requested.length === 0) return [];
  const allowed = new Set((await visiblePipelines()).map((p) => p.id));
  return requested.filter((id) => allowed.has(id));
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
