// Lists the available Knowledge bases (LlamaCloud pipelines) for the Knowledge settings toggles.
// Titles are derived from the pipeline name. Cached briefly so opening the menu isn't a round-trip.

import { visiblePipelines } from "@/lib/knowledge/llamacloud";

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

// Bases whose material is adult-only. The UI marks these 18+ and the terms require you to be 18 to
// switch one on. Keyed by pipeline slug — add a slug here when a base carries adult content.
// (Kept while ciocu-sexual-psychology is withheld via HIDDEN_BASES in lib/knowledge/llamacloud.ts:
// the 18+ plumbing should be ready the moment a base is un-hidden.)
const ADULT_BASES = new Set(["ciocu-sexual-psychology"]);

// Bases that never cost the user energy. Ciocu's own support docs are free to consult: nobody
// should spend their allowance asking how to cancel. We still pay the retrieval cost.
const FREE_BASES = new Set(["ciocu-support"]);

interface Base {
  id: string;
  title: string;
  name: string;
  adult: boolean;
  free: boolean;
}

let cache: { at: number; bases: Base[] } | null = null;
const TTL = 60_000;

export async function GET() {
  if (cache && Date.now() - cache.at < TTL) {
    return Response.json({ bases: cache.bases });
  }
  const pipelines = await visiblePipelines();
  // `name` is the raw pipeline slug (e.g. "ciocu-sexual-psychology") — the client uses it to find
  // the base's description card at /knowledge/<name>-knowledge-description.html.
  const bases: Base[] = pipelines.map((p) => ({
    id: p.id,
    title: titleize(p.name),
    name: p.name,
    adult: ADULT_BASES.has(p.name),
    free: FREE_BASES.has(p.name),
  }));
  cache = { at: Date.now(), bases };
  return Response.json({ bases });
}
