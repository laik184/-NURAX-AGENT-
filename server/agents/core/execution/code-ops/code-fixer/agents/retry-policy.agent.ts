import type { RetryDecision } from "../types.js";

export function decideRetry(
  iteration: number,
  maxIterations: number,
  verificationPassed: boolean,
  plansCount: number,
): RetryDecision {
  if (verificationPassed) {
    return Object.freeze({ shouldRetry: false, reason: "Verification passed." });
  }

  if (iteration >= maxIterations) {
    return Object.freeze({ shouldRetry: false, reason: "Reached maxIterations." });
  }

  if (plansCount === 0) {
    return Object.freeze({ shouldRetry: false, reason: "No further fix plans available." });
  }

  return Object.freeze({ shouldRetry: true, reason: "Verification failed, retrying with next iteration." });
}
