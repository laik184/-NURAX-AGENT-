import { RecoveryPlan, FixResult, RecoveryInput } from "../types";

export function applyFix(plan: RecoveryPlan, input: RecoveryInput): FixResult {
  if (plan.actions.length === 0 || plan.skipReason) {
    return Object.freeze({
      applied: false,
      reason: plan.skipReason ?? "No actions available in recovery plan.",
    });
  }

  const safeActions = plan.actions.filter((a) => a.safe);

  if (safeActions.length === 0) {
    return Object.freeze({
      applied: false,
      reason: "All planned actions were unsafe — skipping fix to preserve system integrity.",
    });
  }

  const bestAction = safeActions.reduce((best, curr) =>
    curr.estimatedSuccessRate > best.estimatedSuccessRate ? curr : best
  );

  const wouldSucceed = simulateAction(bestAction.id, input);

  if (!wouldSucceed) {
    const fallback = safeActions.find((a) => a.id !== bestAction.id);
    if (fallback) {
      return Object.freeze({
        applied: true,
        action: Object.freeze(fallback),
        reason: `Primary action "${bestAction.id}" simulated as failed — applied fallback "${fallback.id}".`,
      });
    }
    return Object.freeze({
      applied: false,
      reason: `Action "${bestAction.id}" simulated as failed — no fallback available.`,
    });
  }

  return Object.freeze({
    applied: true,
    action: Object.freeze(bestAction),
    reason: `Applied recovery action: "${bestAction.id}" — ${bestAction.description}`,
  });
}

function simulateAction(actionId: string, input: RecoveryInput): boolean {
  const alwaysSucceed = new Set([
    "quarantine-and-log",
    "log-and-skip",
    "return-to-agent",
    "escalate-permission-request",
  ]);
  const alwaysFail = new Set<string>();

  if (alwaysSucceed.has(actionId)) return true;
  if (alwaysFail.has(actionId))    return false;

  const context = input.context ?? {};
  const hasNetworkContext = "endpoint" in context || "url" in context;
  if (actionId === "switch-endpoint" && !hasNetworkContext) return false;

  return true;
}
