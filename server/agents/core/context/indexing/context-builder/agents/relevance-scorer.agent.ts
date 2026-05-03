import type { ContextScore, ContextSourceFile } from "../types.js";
import { calculateSimilarity } from "../utils/similarity.util.js";

export function scoreRelevance(
  query: string,
  files: readonly ContextSourceFile[],
): readonly ContextScore[] {
  const scored = files.map((file) => {
    const similarityScore = calculateSimilarity(query, file.content);
    const pathScore = calculateSimilarity(query, file.path) * 0.25;
    const score = Number(Math.min(1, similarityScore + pathScore).toFixed(4));

    const reasons: string[] = [];
    if (similarityScore > 0) reasons.push("query-content-token-overlap");
    if (pathScore > 0) reasons.push("query-path-token-overlap");

    return Object.freeze({
      path: file.path,
      score,
      reasons: Object.freeze(reasons),
    });
  });

  scored.sort((left, right) => right.score - left.score);
  return Object.freeze(scored);
}
