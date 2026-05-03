import type { ContextChunk, ContextScore, RankedContext } from "../types.js";

export function rankContext(
  chunks: readonly ContextChunk[],
  fileScores: readonly ContextScore[],
): readonly RankedContext[] {
  const scoreByPath = new Map(fileScores.map((score) => [score.path, score.score]));

  const ranked = chunks
    .map((chunk) => {
      const fileScore = scoreByPath.get(chunk.path) ?? 0;
      const normalizedTokenScore = chunk.estimatedTokens > 0 ? 1 / chunk.estimatedTokens : 0;
      const score = Number((fileScore + normalizedTokenScore).toFixed(4));
      return { chunk, score };
    })
    .sort((left, right) => right.score - left.score)
    .map((item, index) => Object.freeze({
      chunk: item.chunk,
      score: item.score,
      rank: index + 1,
    }));

  return Object.freeze(ranked);
}
