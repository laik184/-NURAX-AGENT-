import type { SearchResult } from '../types.js';

export function rankResults(
  results: readonly SearchResult[],
  threshold: number,
): readonly SearchResult[] {
  const ranked = results
    .filter((result) => result.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .map((result) => Object.freeze(result));

  return Object.freeze(ranked);
}
