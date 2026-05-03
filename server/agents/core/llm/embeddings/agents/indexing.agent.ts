import type { Chunk, IndexMap } from '../types.js';

export function buildIndexMap(chunks: readonly Chunk[]): IndexMap {
  const indexMap: Record<string, string> = {};

  for (const chunk of chunks) {
    indexMap[chunk.id] = chunk.content;
  }

  return Object.freeze(indexMap);
}
