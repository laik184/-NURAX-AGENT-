import { RecoveryInput, RecoveryResult } from "./types";
import { detectError } from "./agents/error-detector.agent";
import { classifyFailure } from "./agents/failure-classifier.agent";
import { determineRetryStrategy } from "./agents/retry-strategy.agent";
import { planRecovery } from "./agents/recovery-planner.agent";
import { applyFix } from "./agents/fix-applier.agent";
import { checkSafety } from "./agents/safety-guard.agent";
import { getDelay, formatDelay } from "./utils/backoff.util";
import { recordAttempt, setLastError, setStatus, resetForSession } from "./state";

export function recover(input: RecoveryInput): RecoveryResult {
  const logs: string[] = [];
  const startTime = Date.now();

  try {
    resetForSession();
    setStatus("recovering");

    logs.push(`[recovery] Starting recovery — agent="${input.agentId ?? "unknown"}"`);

    const detected = detectError(input);
    logs.push(`[recovery] Error detected: ${detected.hasError} — "${detected.message.slice(0, 120)}"`);

    if (!detected.hasError) {
      setStatus("skipped");
      return Object.freeze({
        success: true,
        recovered: false,
        strategy: "none",
        attempts: 0,
        logs: Object.freeze([...logs, "[recovery] No error detected — nothing to recover."]),
      });
    }

    setLastError(detected.message);

    const classification = classifyFailure(detected);
    logs.push(`[recovery] Classified: type="${classification.type}", recoverable=${classification.isRecoverable}, confidence=${classification.confidence}`);

    if (!classification.isRecoverable) {
      setStatus("failed");
      recordAttempt({ attempt: 0, delayMs: 0, outcome: "failure", timestamp: Date.now() });
      return Object.freeze({
        success: false,
        recovered: false,
        strategy: "no-retry",
        attempts: 0,
        logs: Object.freeze([...logs, `[recovery] Failure type "${classification.type}" is non-recoverable — aborting.`]),
        error: detected.message,
      });
    }

    const strategy = determineRetryStrategy(classification, input);
    logs.push(`[recovery] Strategy: ${strategy.kind} — ${strategy.reason}`);

    if (strategy.kind === "no-retry") {
      setStatus("failed");
      recordAttempt({ attempt: 0, delayMs: 0, outcome: "failure", timestamp: Date.now() });
      return Object.freeze({
        success: false,
        recovered: false,
        strategy: strategy.kind,
        attempts: 0,
        logs: Object.freeze([...logs, "[recovery] Policy specifies no-retry — stopping."]),
        error: detected.message,
      });
    }

    const plan = planRecovery(classification, strategy);
    logs.push(`[recovery] Plan: ${plan.actions.length} action(s), estimated success rate=${plan.estimatedSuccessRate}`);

    let attemptCount = 0;
    let recovered = false;

    for (let attempt = 1; attempt <= strategy.maxAttempts; attempt++) {
      attemptCount = attempt;
      const delayMs = getDelay(strategy.kind, attempt, strategy.baseDelayMs, strategy.maxDelayMs);
      logs.push(`[recovery] Attempt ${attempt}/${strategy.maxAttempts} — delay=${formatDelay(delayMs)}`);

      const fix = applyFix(plan, input);
      logs.push(`[recovery] Fix applied=${fix.applied} — ${fix.reason}`);

      const safety = checkSafety(fix, input);
      logs.push(`[recovery] Safety check: safe=${safety.safe} — ${safety.reason}`);

      if (!safety.safe) {
        logs.push(`[recovery] Safety guard blocked execution — aborting attempt ${attempt}.`);
        recordAttempt({ attempt, delayMs, outcome: "failure", timestamp: Date.now() });
        continue;
      }

      if (fix.applied) {
        recovered = true;
        recordAttempt({ attempt, delayMs, outcome: "success", timestamp: Date.now() });
        logs.push(`[recovery] Recovery succeeded on attempt ${attempt}.`);
        break;
      }

      recordAttempt({ attempt, delayMs, outcome: "failure", timestamp: Date.now() });

      if (attempt < strategy.maxAttempts) {
        logs.push(`[recovery] Attempt ${attempt} failed — will retry.`);
      }
    }

    const elapsed = Date.now() - startTime;

    if (recovered) {
      setStatus("recovered");
      return Object.freeze({
        success: true,
        recovered: true,
        strategy: strategy.kind,
        attempts: attemptCount,
        logs: Object.freeze([...logs, `[recovery] Complete — recovered in ${elapsed}ms after ${attemptCount} attempt(s).`]),
      });
    }

    setStatus("failed");
    return Object.freeze({
      success: false,
      recovered: false,
      strategy: strategy.kind,
      attempts: attemptCount,
      logs: Object.freeze([...logs, `[recovery] All ${attemptCount} attempt(s) exhausted — recovery failed after ${elapsed}ms.`]),
      error: detected.message,
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logs.push(`[recovery] Internal error: ${error}`);
    setStatus("failed");
    return Object.freeze({
      success: false,
      recovered: false,
      strategy: "unknown",
      attempts: 0,
      logs: Object.freeze(logs),
      error,
    });
  }
}
