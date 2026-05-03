import { MemoryItem, MemoryInput, DeduplicationResult } from "../types";
import { combinedSimilarity, isHighSimilarity } from "../utils/similarity.util";

export function checkDuplicate(
  input: MemoryInput,
  existingItems: readonly MemoryItem[]
): DeduplicationResult {
  let bestMatch: MemoryItem | null = null;
  let bestScore = 0;

  for (const item of existingItems) {
    const sim = combinedSimilarity(input.content, item.content);
    if (sim > bestScore) {
      bestScore = sim;
      bestMatch = item;
    }
  }

  if (bestMatch !== null && isHighSimilarity(bestScore)) {
    return Object.freeze({
      isDuplicate: true,
      existingId: bestMatch.id,
      similarity: bestScore,
    });
  }

  return Object.freeze({
    isDuplicate: false,
    similarity: bestScore,
  });
}

export function countSimilar(
  input: MemoryInput,
  existingItems: readonly MemoryItem[],
  threshold: number
): number {
  return existingItems.filter((item) => {
    const sim = combinedSimilarity(input.content, item.content);
    return sim >= threshold;
  }).length;
}
