// One portable, versioned memory bundle — the payload for BOTH file download/upload and
// cross-device sync. Blocks' embeddings are packed as base64 (compact + JSON-safe).

import { exportAll, importRecords, type StoredBlock } from "@/lib/memory/store";
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

function base64ToF32(s: string): Float32Array {
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Float32Array(bytes.buffer);
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

export async function mergeBundle(
  bundle: MemoryBundle,
): Promise<{ threads: number; messages: number; blocks: number }> {
  const blocks = bundle.blocks.map(
    (b) => ({ ...b, embedding: base64ToF32(b.embedding) }) as StoredBlock,
  );
  const added = await importRecords({
    threads: bundle.threads as never,
    messages: bundle.messages as never,
    blocks,
  });
  if (typeof bundle.bond === "number") saveBond(Math.max(loadBond(), bundle.bond));
  return added;
}
