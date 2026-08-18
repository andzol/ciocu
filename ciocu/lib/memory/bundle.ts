// One portable, versioned memory bundle — the payload for BOTH file download/upload and
// cross-device sync. Blocks' embeddings are packed as base64 (compact + JSON-safe).

import { clearAllMemory, exportAll, importRecords, type StoredBlock } from "@/lib/memory/store";
import { loadBond, saveBond } from "@/lib/mood/mood";

export const BUNDLE_VERSION = 1;

type SerializedBlock = Omit<StoredBlock, "embedding"> & { embedding: string };

export interface MemoryBundle {
  app: "ciocu";
  bundleVersion: number;
  exportedAt: number;
  bond: number;
  threads: unknown[];
  messages: unknown[];
  blocks: SerializedBlock[];
}

function f32ToBase64(v: Float32Array): string {
  const bytes = new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

/**
 * Decode a packed embedding, or null if there isn't a usable one.
 *
 * Returns null rather than throwing because a bundle is allowed to arrive without vectors: a
 * hand-written or hand-edited memory file is a perfectly reasonable thing to feed her, and blocks
 * are re-embeddable from their own text. This used to decode unconditionally, so one block with no
 * `embedding` key threw DOMException out of the whole import and the entire file was rejected.
 */
function base64ToF32(s: unknown): Float32Array | null {
  if (typeof s !== "string" || s.length === 0) return null;
  try {
    const bin = atob(s);
    if (bin.length === 0 || bin.length % 4 !== 0) return null; // not a Float32 buffer
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Float32Array(bytes.buffer);
  } catch {
    return null;
  }
}

export async function serializeMemory(): Promise<MemoryBundle> {
  const { threads, messages, blocks } = await exportAll();
  return {
    app: "ciocu",
    bundleVersion: BUNDLE_VERSION,
    exportedAt: Date.now(),
    bond: loadBond(),
    threads,
    messages,
    blocks: blocks.map((b) => ({ ...b, embedding: f32ToBase64(b.embedding) })),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isBundle(x: any): x is MemoryBundle {
  return !!x && x.app === "ciocu" && typeof x.bundleVersion === "number" && Array.isArray(x.blocks);
}

/** What a bundle holds — shown in the confirmation before anything is written. */
export interface BundleSummary {
  blocks: number;
  threads: number;
  messages: number;
  /** Blocks that arrived without a usable vector and will be re-embedded on this device. */
  needEmbedding: number;
  /** Blocks with neither a vector nor text — nothing can be done with these, so they're dropped. */
  unusable: number;
  exportedAt: number;
}

export function summarizeBundle(bundle: MemoryBundle): BundleSummary {
  let needEmbedding = 0;
  let unusable = 0;
  for (const b of bundle.blocks ?? []) {
    if (base64ToF32(b.embedding)) continue;
    if (typeof b.content === "string" && b.content.trim()) needEmbedding++;
    else unusable++;
  }
  return {
    blocks: (bundle.blocks ?? []).length - unusable,
    threads: (bundle.threads ?? []).length,
    messages: (bundle.messages ?? []).length,
    needEmbedding,
    unusable,
    exportedAt: bundle.exportedAt,
  };
}

export interface ImportOptions {
  /** "merge" unions by id and loses nothing. "replace" wipes this device's memory first. */
  mode?: "merge" | "replace";
  onProgress?: (step: { frac: number; label: string }) => void;
}

/**
 * Bring a bundle into this device's store.
 *
 * Blocks missing a vector are re-embedded here, on-device, from their own text — which is what
 * makes a hand-authored memory file usable. That step is why this reports progress: the embedding
 * model may still need to load, so it is the slow part by a wide margin.
 */
export async function mergeBundle(
  bundle: MemoryBundle,
  { mode = "merge", onProgress }: ImportOptions = {},
): Promise<{ threads: number; messages: number; blocks: number }> {
  const report = (frac: number, label: string) => onProgress?.({ frac, label });

  report(0.05, "Reading the file");
  const decoded = (bundle.blocks ?? []).map((b) => ({ raw: b, vec: base64ToF32(b.embedding) }));

  const missing = decoded.filter(
    (d) => !d.vec && typeof d.raw.content === "string" && d.raw.content.trim().length > 0,
  );
  if (missing.length > 0) {
    report(0.15, "Making sense of them");
    const { embed } = await import("@/lib/embeddings/embedder");
    // "passage: " — the e5 document prefix, matching how reflect.ts embeds anything it stores.
    // Query-side text uses "query: "; mixing the two would quietly degrade every later recall.
    const vectors = await embed(
      missing.map((m) => String(m.raw.content)),
      "passage: ",
    );
    missing.forEach((m, i) => {
      m.vec = vectors[i] ?? null;
    });
  }

  const blocks = decoded
    .filter((d): d is { raw: SerializedBlock; vec: Float32Array } => d.vec !== null)
    .map((d) => ({ ...d.raw, embedding: d.vec }) as unknown as StoredBlock);

  if (mode === "replace") {
    report(0.7, "Setting aside what she knew");
    await clearAllMemory();
  }

  report(0.8, "Taking them in");
  const added = await importRecords({
    threads: bundle.threads as never,
    messages: bundle.messages as never,
    blocks,
  });

  // Merging can only ever deepen the bond; replacing adopts the file's value outright.
  if (typeof bundle.bond === "number") {
    saveBond(mode === "replace" ? bundle.bond : Math.max(loadBond(), bundle.bond));
  }

  report(1, "Done");
  return added;
}
