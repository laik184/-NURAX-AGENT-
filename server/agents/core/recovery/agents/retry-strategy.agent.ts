import { FailureClassification, RecoveryInput, RetryStrategy } from "../types";
import { getPolicyForFailure, isRetryable } from "../utils/retry-policy.util";

const DEFAULT_MAX_ATTEMPTS = 3;

export function determineRetryStrategy(
  classification: FailureClassification,
  input: RecoveryInput
): RetryStrategy {
  if (!classification.isRecoverable) {
    return Object.freeze({
      kind: "no-retry",
      maxAttempts: 0,
      baseDelayMs: 0,
      maxDelayMs: 0,
      reason: `Failure type "${classification.type}" is non-recoverable — no retry will be attempted.`,
    });
  }

  if (!isRetryable(classification.type)) {
    return Object.freeze({
      kind: "no-retry",
      maxAttempts: 0,
      baseDelayMs: 0,
      maxDelayMs: 0,
      reason: `Retry policy for "${classification.type}" specifies no-retry.`,
    });
  }

  const policy = getPolicyForFailure(classification.type);
  const maxAttempts = Math.min(
    input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
    policy.maxAttempts
  );

  return Object.freeze({
    kind: policy.strategyKind,
    maxAttempts,
    baseDelayMs: policy.baseDelayMs,
    maxDelayMs: policy.maxDelayMs,
    reason: `Using ${policy.strategyKind} strategy for "${classification.type}" — max ${maxAttempts} attempt(s).`,
  });
}
