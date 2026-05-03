import { DetectedError, FailureClassification, FailureType } from "../types";

interface ClassifierRule {
  readonly patterns: readonly RegExp[];
  readonly type: FailureType;
  readonly isRecoverable: boolean;
  readonly confidence: number;
}

const CLASSIFIER_RULES: readonly ClassifierRule[] = Object.freeze([
  {
    patterns: [/timeout/i, /timed out/i, /etimedout/i, /request timed/i],
    type: "timeout",
    isRecoverable: true,
    confidence: 0.92,
  },
  {
    patterns: [/econnrefused/i, /network/i, /enotfound/i, /socket hang/i, /fetch failed/i],
    type: "network",
    isRecoverable: true,
    confidence: 0.90,
  },
  {
    patterns: [/cannot find module/i, /module not found/i, /enoent/i, /no such file/i],
    type: "dependency",
    isRecoverable: true,
    confidence: 0.88,
  },
  {
    patterns: [/syntaxerror/i, /unexpected token/i, /unexpected end/i, /invalid syntax/i],
    type: "syntax",
    isRecoverable: false,
    confidence: 0.95,
  },
  {
    patterns: [/permission denied/i, /eacces/i, /eperm/i, /access denied/i, /not authorized/i],
    type: "permission",
    isRecoverable: false,
    confidence: 0.93,
  },
  {
    patterns: [/out of memory/i, /heap out of memory/i, /enomem/i, /allocation failed/i],
    type: "memory",
    isRecoverable: false,
    confidence: 0.91,
  },
  {
    patterns: [/validation failed/i, /invalid input/i, /schema mismatch/i, /contract violation/i],
    type: "validation",
    isRecoverable: true,
    confidence: 0.87,
  },
  {
    patterns: [/execution failed/i, /exited with code/i, /process killed/i, /signal aborted/i],
    type: "execution",
    isRecoverable: true,
    confidence: 0.85,
  },
  {
    patterns: [/typeerror/i, /referenceerror/i, /rangeerror/i, /is not a function/i, /cannot read prop/i],
    type: "runtime",
    isRecoverable: true,
    confidence: 0.84,
  },
]);

export function classifyFailure(detected: DetectedError): FailureClassification {
  const target = `${detected.message} ${detected.stack ?? ""}`.toLowerCase();

  for (const rule of CLASSIFIER_RULES) {
    const matched = rule.patterns.some((p) => p.test(target));
    if (matched) {
      return Object.freeze({
        type: rule.type,
        confidence: rule.confidence,
        isRecoverable: rule.isRecoverable,
        reason: `Pattern matched for type="${rule.type}" with confidence=${rule.confidence}.`,
      });
    }
  }

  return Object.freeze({
    type: "unknown" as FailureType,
    confidence: 0.5,
    isRecoverable: true,
    reason: "No pattern matched — classified as unknown, attempting generic recovery.",
  });
}
