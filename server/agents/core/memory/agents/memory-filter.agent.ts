import { MemoryInput, MemoryDecision, MemoryScore } from "../types";

const SCORE_THRESHOLD = 30;

export function filterMemory(
  input: MemoryInput,
  score: MemoryScore,
  isRepeatPattern: boolean,
  isDuplicate: boolean
): MemoryDecision {
  if (isDuplicate) {
    return Object.freeze({
      kind: "IGNORE",
      reason: "Duplicate memory detected — skipping storage.",
      score: score.total,
    });
  }

  if (isTemporary(input)) {
    return Object.freeze({
      kind: "IGNORE",
      reason: "Input classified as temporary/low-value — skipping.",
      score: score.total,
    });
  }

  if (isCriticalFailure(input)) {
    return Object.freeze({
      kind: "SAVE",
      reason: "Critical failure detected — forcing storage.",
      score: score.total,
    });
  }

  if (isRepeatPattern) {
    return Object.freeze({
      kind: "SAVE",
      reason: "Repeated pattern detected — storing for learning.",
      score: score.total,
    });
  }

  if (score.total >= SCORE_THRESHOLD) {
    return Object.freeze({
      kind: "SAVE",
      reason: `Score ${score.total} exceeds threshold ${SCORE_THRESHOLD} — storing.`,
      score: score.total,
    });
  }

  return Object.freeze({
    kind: "IGNORE",
    reason: `Score ${score.total} below threshold ${SCORE_THRESHOLD} and no override rule matched.`,
    score: score.total,
  });
}

function isTemporary(input: MemoryInput): boolean {
  const lowerContent = input.content.toLowerCase();
  const temporaryKeywords = ["temp", "test", "debug", "placeholder", "todo", "fixme", "tmp"];
  return (
    input.content.length < 20 ||
    temporaryKeywords.some((kw) => lowerContent.includes(kw)) && input.content.length < 80
  );
}

function isCriticalFailure(input: MemoryInput): boolean {
  if (input.failed !== true) return false;
  const lowerContent = input.content.toLowerCase();
  const criticalKeywords = ["crash", "fatal", "critical", "unrecoverable", "panic", "abort"];
  return criticalKeywords.some((kw) => lowerContent.includes(kw));
}
