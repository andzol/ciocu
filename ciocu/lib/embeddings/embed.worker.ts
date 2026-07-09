/// <reference lib="webworker" />
// Local sentence-embedding worker. Runs MiniLM (transformers.js) fully on-device, off the main
// thread so the eye animation never stutters. Model is fetched once from the HF hub and cached.

import { pipeline, env, type FeatureExtractionPipeline } from "@huggingface/transformers";

env.allowLocalModels = false; // load from the hub

// multilingual-e5-small: strong asymmetric (query<->passage) retrieval, multilingual (incl.
// Hungarian). Uses "query: " / "passage: " instruction prefixes, which the caller passes in.
let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;
function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractorPromise) {
    extractorPromise = pipeline(
      "feature-extraction",
      "Xenova/multilingual-e5-small",
    ) as Promise<FeatureExtractionPipeline>;
  }
  return extractorPromise;
}

interface EmbedRequest {
  id: number;
  texts: string[];
  instruction?: string; // e.g. "query: " or "passage: "
}

self.onmessage = async (e: MessageEvent<EmbedRequest>) => {
  const { id, texts, instruction } = e.data;
  try {
    const extractor = await getExtractor();
    const inputs = instruction ? texts.map((t) => instruction + t) : texts;
    const output = await extractor(inputs, { pooling: "mean", normalize: true });
    const vectors = output.tolist() as number[][]; // [n][384], L2-normalized
    (self as unknown as Worker).postMessage({ id, vectors });
  } catch (err) {
    (self as unknown as Worker).postMessage({ id, error: String(err) });
  }
};
