import type { Chunk } from '../types.js';
import { generateId } from '../utils/id-generator.util.js';
import { tokenize } from '../utils/tokenizer.util.js';

export function chunkContent(
  content: string,
  maxTokensPerChunk: number,
  overlapTokens: number,
): readonly Chunk[] {
  const tokens = tokenize(content);
  if (tokens.length === 0) {
    return Object.freeze([]);
  }

  const safeMax = Math.max(1, maxTokensPerChunk);
  const safeOverlap = Math.max(0, Math.min(overlapTokens, safeMax - 1));
  const chunks: Chunk[] = [];

  let start = 0;
  while (start < tokens.length) {
    const end = Math.min(start + safeMax, tokens.length);
    const chunkTokens = tokens.slice(start, end);
    const chunkContentValue = chunkTokens.join(' ');
    const id = generateId('chunk', chunkContentValue, chunks.length);

    chunks.push(
      Object.freeze({
        id,
        content: chunkContentValue,
        tokenCount: chunkTokens.length,
        startToken: start,
        endToken: end,
      }),
    );

    if (end >= tokens.length) {
      break;
    }

    start = end - safeOverlap;
  }

  return Object.freeze(chunks);
}
