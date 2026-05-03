import { MemoryInput, MemoryScore, ClassificationResult, MemoryType } from "../types";

const LONG_TERM_SCORE_THRESHOLD = 65;
const PATTERN_SCORE_THRESHOLD = 50;

export function classifyMemory(
  input: MemoryInput,
  score: MemoryScore,
  isRepeatPattern: boolean
): ClassificationResult {
  if (isRepeatPattern && score.repetition >= 15) {
    return Object.freeze({
      type: "pattern" as MemoryType,
      reason: "High repetition score with confirmed pattern — classified as pattern memory.",
    });
  }

  if (score.total >= LONG_TERM_SCORE_THRESHOLD || input.success === true) {
    return Object.freeze({
      type: "long" as MemoryType,
      reason: `Score ${score.total} qualifies for long-term retention.`,
    });
  }

  if (score.total >= PATTERN_SCORE_THRESHOLD && (input.tags?.length ?? 0) >= 2) {
    return Object.freeze({
      type: "pattern" as MemoryType,
      reason: "Moderate score with multiple tags — classified as pattern for reuse.",
    });
  }

  return Object.freeze({
    type: "short" as MemoryType,
    reason: "Default classification — stored in short-term memory.",
  });
}
