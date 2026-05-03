import type { ContextChunk } from "../types.js";

const PRIORITY_TERMS = ["error", "exception", "todo", "fix", "api", "auth", "security", "query"];

export function rankChunksByPriority(chunks: readonly ContextChunk[]): readonly ContextChunk[] {
  const scored = chunks.map((chunk) => {
    const lower = chunk.content.toLowerCase();
    const signalMatches = PRIORITY_TERMS.reduce(
      (score, term) => score + (lower.includes(term) ? 1 : 0),
      0,
    );
    const densityBoost = Math.min(1, chunk.tokenEstimate / 500);
    const importanceScore = Number((signalMatches + densityBoost).toFixed(4));

    return Object.freeze({
      ...chunk,
      importanceScore,
    });
  });

  return Object.freeze(scored.sort((left, right) => (right.importanceScore ?? 0) - (left.importanceScore ?? 0)));
}
