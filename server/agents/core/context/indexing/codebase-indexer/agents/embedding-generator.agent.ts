import type { EmbeddingVector, ParsedFile } from '../types.js';
import { chunkTextByLines } from '../utils/chunker.util.js';

export interface EmbeddingGeneratorInput {
  readonly parsedFiles: readonly ParsedFile[];
  readonly maxCharsPerChunk?: number;
}

const DEFAULT_MAX_CHARS_PER_CHUNK = 1400;
const VECTOR_DIMENSION = 32;

export function generateEmbeddings(input: EmbeddingGeneratorInput): readonly EmbeddingVector[] {
  const vectors: EmbeddingVector[] = [];
  const maxCharsPerChunk = input.maxCharsPerChunk ?? DEFAULT_MAX_CHARS_PER_CHUNK;

  for (const parsed of input.parsedFiles) {
    const chunks = chunkTextByLines(parsed.sourceText, maxCharsPerChunk);
    chunks.forEach((chunk, chunkIndex) => {
      const id = `${parsed.file.path}#${chunkIndex}`;
      vectors.push({
        id,
        filePath: parsed.file.path,
        chunkIndex,
        text: chunk,
        vector: Object.freeze(stablePseudoEmbedding(chunk, VECTOR_DIMENSION)),
      });
    });
  }

  return Object.freeze(vectors);
}

function stablePseudoEmbedding(content: string, dimension: number): number[] {
  const seed = hashString(content);
  const result: number[] = [];

  let state = seed;
  for (let index = 0; index < dimension; index += 1) {
    state = (1664525 * state + 1013904223) >>> 0;
    const normalized = (state / 0xffffffff) * 2 - 1;
    result.push(Number(normalized.toFixed(6)));
  }

  return result;
}

function hashString(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
