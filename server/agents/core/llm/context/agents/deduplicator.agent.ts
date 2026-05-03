import type { ContextChunk } from "../types.js";
import { calculateSimilarity } from "../utils/similarity.util.js";

const DUPLICATE_THRESHOLD = 0.88;

export function deduplicateChunks(chunks: readonly ContextChunk[]): readonly ContextChunk[] {
  const unique: ContextChunk[] = [];

  for (const chunk of chunks) {
    const exists = unique.some((kept) => calculateSimilarity(kept.content, chunk.content) >= DUPLICATE_THRESHOLD);
    if (!exists) {
      unique.push(chunk);
    }
  }

  return Object.freeze(unique);
}
