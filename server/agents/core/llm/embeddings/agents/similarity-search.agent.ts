import type { EmbeddingVector, SearchResult } from '../types.js';
import { cosineSimilarity } from '../utils/cosine-similarity.util.js';

export function similaritySearch(
  queryVector: readonly number[],
  vectors: readonly EmbeddingVector[],
  topK: number,
): readonly SearchResult[] {
  const safeTopK = Math.max(1, topK);

  const scored = vectors.map((vector) =>
    Object.freeze({
      id: vector.id,
      chunkId: vector.chunkId,
      score: cosineSimilarity(queryVector, vector.values),
      content: vector.content,
    }),
  );

  scored.sort((a, b) => b.score - a.score);
  return Object.freeze(scored.slice(0, safeTopK));
}
