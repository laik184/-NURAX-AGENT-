import { FailureClassification, RetryStrategy, RecoveryPlan, RecoveryAction } from "../types";

const ACTION_CATALOG: Record<string, readonly RecoveryAction[]> = {
  timeout: Object.freeze([
    Object.freeze({ id: "reduce-payload", description: "Reduce request payload size before retry.", safe: true, estimatedSuccessRate: 0.55 }),
    Object.freeze({ id: "retry-with-backoff", description: "Retry the operation with exponential backoff.", safe: true, estimatedSuccessRate: 0.75 }),
  ]),
  network: Object.freeze([
    Object.freeze({ id: "retry-connection", description: "Retry the network connection.", safe: true, estimatedSuccessRate: 0.70 }),
    Object.freeze({ id: "switch-endpoint", description: "Switch to fallback endpoint if available.", safe: true, estimatedSuccessRate: 0.60 }),
  ]),
  dependency: Object.freeze([
    Object.freeze({ id: "reinstall-dependency", description: "Trigger dependency reinstall.", safe: true, estimatedSuccessRate: 0.65 }),
    Object.freeze({ id: "use-cached-version", description: "Fall back to last cached module version.", safe: true, estimatedSuccessRate: 0.50 }),
  ]),
  syntax: Object.freeze([
    Object.freeze({ id: "return-to-agent", description: "Return error to originating agent for re-generation.", safe: true, estimatedSuccessRate: 0.80 }),
  ]),
  permission: Object.freeze([
    Object.freeze({ id: "escalate-permission-request", description: "Log permission error and escalate to operator.", safe: true, estimatedSuccessRate: 0.30 }),
  ]),
  memory: Object.freeze([
    Object.freeze({ id: "free-cache", description: "Attempt to free non-essential caches.", safe: true, estimatedSuccessRate: 0.40 }),
    Object.freeze({ id: "reduce-concurrency", description: "Reduce concurrent operations and retry.", safe: true, estimatedSuccessRate: 0.50 }),
  ]),
  validation: Object.freeze([
    Object.freeze({ id: "re-validate-with-relaxed-schema", description: "Retry validation with relaxed schema constraints.", safe: true, estimatedSuccessRate: 0.55 }),
    Object.freeze({ id: "quarantine-and-log", description: "Quarantine invalid output and log for review.", safe: true, estimatedSuccessRate: 0.90 }),
  ]),
  execution: Object.freeze([
    Object.freeze({ id: "requeue-task", description: "Re-queue the failed task for execution.", safe: true, estimatedSuccessRate: 0.65 }),
    Object.freeze({ id: "checkpoint-restore", description: "Restore from last checkpoint before failure.", safe: true, estimatedSuccessRate: 0.70 }),
  ]),
  runtime: Object.freeze([
    Object.freeze({ id: "isolate-and-retry", description: "Isolate failing module and retry in clean context.", safe: true, estimatedSuccessRate: 0.60 }),
    Object.freeze({ id: "fallback-implementation", description: "Switch to fallback implementation.", safe: true, estimatedSuccessRate: 0.55 }),
  ]),
  unknown: Object.freeze([
    Object.freeze({ id: "generic-retry", description: "Generic retry with linear backoff.", safe: true, estimatedSuccessRate: 0.45 }),
    Object.freeze({ id: "log-and-skip", description: "Log failure details and skip this operation.", safe: true, estimatedSuccessRate: 0.95 }),
  ]),
};

export function planRecovery(
  classification: FailureClassification,
  strategy: RetryStrategy
): RecoveryPlan {
  if (strategy.kind === "no-retry") {
    return Object.freeze({
      actions: Object.freeze([]),
      estimatedSuccessRate: 0,
      skipReason: `No-retry strategy for "${classification.type}" — no plan generated.`,
    });
  }

  const catalog = ACTION_CATALOG[classification.type] ?? ACTION_CATALOG["unknown"];
  const actions = catalog.filter((a) => a.safe);
  const avgRate = actions.reduce((sum, a) => sum + a.estimatedSuccessRate, 0) / Math.max(actions.length, 1);

  return Object.freeze({
    actions: Object.freeze([...actions]),
    estimatedSuccessRate: Math.round(avgRate * 100) / 100,
  });
}
