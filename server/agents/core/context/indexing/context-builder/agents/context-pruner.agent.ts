import type { ContextChunk } from "../types.js";

export function pruneContext(
  sortedChunks: readonly ContextChunk[],
  maxTokens: number,
): readonly ContextChunk[] {
  const kept: ContextChunk[] = [];
  let usedTokens = 0;

  for (const chunk of sortedChunks) {
    if (usedTokens + chunk.estimatedTokens > maxTokens) continue;
    kept.push(chunk);
    usedTokens += chunk.estimatedTokens;
  }

  return Object.freeze(kept);
}
