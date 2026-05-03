import type { EmbeddingVector } from '../types.js';

export function upsertVectors(
  existing: readonly EmbeddingVector[],
  incoming: readonly EmbeddingVector[],
): readonly EmbeddingVector[] {
  const byId = new Map<string, EmbeddingVector>();

  for (const vector of existing) {
    byId.set(vector.id, vector);
  }

  for (const vector of incoming) {
    byId.set(vector.id, vector);
  }

  return Object.freeze([...byId.values()]);
}

export function getAllVectors(vectors: readonly EmbeddingVector[]): readonly EmbeddingVector[] {
  return vectors;
}
