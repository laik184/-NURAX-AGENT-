import { MemoryInput, MemoryScore } from "../types";
import {
  computeSuccessScore,
  computeRepetitionScore,
  computeComplexityScore,
  computeRarityScore,
  aggregateScore,
} from "../utils/scoring.util";

export function scoreMemory(
  input: MemoryInput,
  occurrences: number,
  existingSimilarCount: number
): MemoryScore {
  const success = computeSuccessScore(input.success, input.failed);
  const repetition = computeRepetitionScore(occurrences);
  const complexity = computeComplexityScore(input.content);
  const rarity = computeRarityScore(input.tags?.length ?? 0, existingSimilarCount);
  const total = aggregateScore({ success, repetition, complexity, rarity });

  return Object.freeze({
    total,
    success,
    repetition,
    complexity,
    rarity,
    breakdown: Object.freeze({
      success,
      repetition,
      complexity,
      rarity,
    }),
  });
}
