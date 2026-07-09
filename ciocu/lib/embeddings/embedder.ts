// Main-thread wrapper around the embedding worker. Lazily spins the worker up on first use and
// resolves each request by id. All on-device; nothing leaves the browser.

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<
  number,
  { resolve: (v: Float32Array[]) => void; reject: (e: Error) => void }
>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("./embed.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent) => {
      const { id, vectors, error } = e.data as {
        id: number;
        vectors?: number[][];
        error?: string;
      };
      const p = pending.get(id);
      if (!p) return;
      pending.delete(id);
      if (error) p.reject(new Error(error));
      else p.resolve((vectors ?? []).map((v) => Float32Array.from(v)));
    };
    worker.onerror = () => {
      for (const [, p] of pending) p.reject(new Error("embedding worker error"));
      pending.clear();
    };
  }
  return worker;
}

export function embed(texts: string[], instruction?: string): Promise<Float32Array[]> {
  if (texts.length === 0) return Promise.resolve([]);
  return new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ id, texts, instruction });
  });
}

export async function embedOne(text: string, instruction?: string): Promise<Float32Array> {
  const [vec] = await embed([text], instruction);
  return vec;
}

/** Cosine similarity for L2-normalized vectors = dot product. */
export function cosine(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) dot += a[i] * b[i];
  return dot;
}
