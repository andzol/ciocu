// Lists the available Knowledge bases (LlamaCloud pipelines) for the Knowledge settings toggles.
// Titles are derived from the pipeline name. Cached briefly so opening the menu isn't a round-trip.

import { listPipelines } from "@/lib/knowledge/llamacloud";

export const runtime = "nodejs";

function titleize(name: string): string {
  const t = name
    .replace(/^ciocu[-_\s]*/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return t || name;
}

let cache: { at: number; bases: { id: string; title: string; name: string }[] } | null = null;
const TTL = 60_000;

export async function GET() {
  if (cache && Date.now() - cache.at < TTL) {
    return Response.json({ bases: cache.bases });
  }
  const pipelines = await listPipelines();
  // `name` is the raw pipeline slug (e.g. "ciocu-sexual-psychology") — the client uses it to find
  // the base's description card at /knowledge/<name>-knowledge-description.html.
  const bases = pipelines.map((p) => ({ id: p.id, title: titleize(p.name), name: p.name }));
  cache = { at: Date.now(), bases };
  return Response.json({ bases });
}
