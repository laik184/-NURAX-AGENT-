import type { Chunk, EmbeddingProvider } from '../types.js';
import { normalizeVector } from '../utils/vector-normalizer.util.js';

const embeddingCache = new Map<string, readonly number[]>();

export async function generateChunkEmbeddings(
  chunks: readonly Chunk[],
  provider: EmbeddingProvider,
  batchSize: number,
): Promise<ReadonlyMap<string, readonly number[]>> {
  const uniqueContents = [...new Set(chunks.map((chunk) => chunk.content))];
  const missing = uniqueContents.filter((content) => !embeddingCache.has(content));
  const safeBatchSize = Math.max(1, batchSize);

  for (let i = 0; i < missing.length; i += safeBatchSize) {
    const batch = missing.slice(i, i + safeBatchSize);
    const vectors = await provider.embed(batch);

    if (vectors.length !== batch.length) {
      throw new Error('Embedding provider returned unexpected vector cardinality.');
    }

    for (let j = 0; j < batch.length; j += 1) {
      embeddingCache.set(batch[j] ?? '', normalizeVector(vectors[j] ?? []));
    }
  }

  const byChunkId = new Map<string, readonly number[]>();

  for (const chunk of chunks) {
    const vector = embeddingCache.get(chunk.content);
    if (!vector) {
      throw new Error(`Missing vector for chunk id: ${chunk.id}`);
    }

    byChunkId.set(chunk.id, vector);
  }

  return byChunkId;
}
