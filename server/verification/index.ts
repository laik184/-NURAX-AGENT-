/**
 * server/verification/index.ts
 *
 * Public API for the verification layer.
 *
 * All external consumers (tool-loop.agent.ts, API routes, main.ts)
 * import ONLY from here. Internal modules are implementation details.
 */

export { runVerificationEngine, buildVerificationFeedback, buildExhaustedFeedback }
  from "./engine/verification-engine.ts";

export { getOrCreateRetryController, releaseRetryController, RetryController }
  from "./retry/retry-controller.ts";

export {
  emitVerificationStarted,
  emitVerificationPassed,
  emitVerificationFailed,
  emitVerificationExhausted,
} from "./events/verification-events.ts";

export type { VerificationReport, CheckResult, CheckStatus, RetryState }
  from "./types.ts";
