import type { NormalizedDecision } from "../types";
import { logEntry, logBlocked } from "../utils/logger.util";

export interface SafetyEnforcerOutput {
  success: boolean;
  logs: string[];
  error?: string;
  allowed?: boolean;
  blockedReason?: string;
  blockedDecisionIds?: string[];
}

const BLOCKED_ACTIONS_WITHOUT_FLAG = new Set(["abort", "escalate"]);
const MINIMUM_CONFIDENCE = 0.25;
const HIGH_RISK_LEVELS = new Set(["high", "critical"]);

export function enforceSafety(
  decision: NormalizedDecision,
  allDecisions: NormalizedDecision[],
  allowDestructive: boolean,
  minConfidenceThreshold: number
): SafetyEnforcerOutput {
  const logs: string[] = [];
  const blockedDecisionIds: string[] = [];

  try {
    logs.push(logEntry("safety-enforcer", `checking decision id=${decision.id} action=${decision.action} risk=${decision.riskLevel} destructive=${decision.isDestructive}`));

    if (decision.isDestructive && !allowDestructive) {
      const reason = "destructive action blocked — allowDestructive flag not set";
      logs.push(logBlocked("safety-enforcer", decision.id, reason));
      blockedDecisionIds.push(decision.id);
      return { success: true, logs, allowed: false, blockedReason: reason, blockedDecisionIds };
    }

    const effectiveMinConf = Math.max(MINIMUM_CONFIDENCE, minConfidenceThreshold);
    if (decision.normalizedConfidence < effectiveMinConf) {
      const reason = `confidence ${decision.normalizedConfidence.toFixed(3)} below threshold ${effectiveMinConf.toFixed(3)}`;
      logs.push(logBlocked("safety-enforcer", decision.id, reason));
      blockedDecisionIds.push(decision.id);
      return { success: true, logs, allowed: false, blockedReason: reason, blockedDecisionIds };
    }

    if (HIGH_RISK_LEVELS.has(decision.riskLevel) && BLOCKED_ACTIONS_WITHOUT_FLAG.has(decision.action) && !allowDestructive) {
      const reason = `high-risk action '${decision.action}' at risk level '${decision.riskLevel}' requires allowDestructive`;
      logs.push(logBlocked("safety-enforcer", decision.id, reason));
      blockedDecisionIds.push(decision.id);
      return { success: true, logs, allowed: false, blockedReason: reason, blockedDecisionIds };
    }

    if (decision.riskLevel === "critical" && !allowDestructive) {
      const reason = "critical risk level blocked without allowDestructive flag";
      logs.push(logBlocked("safety-enforcer", decision.id, reason));
      blockedDecisionIds.push(decision.id);
      return { success: true, logs, allowed: false, blockedReason: reason, blockedDecisionIds };
    }

    const conflictingDestructive = allDecisions.some(
      (d) => d.id !== decision.id && d.isDestructive && d.target === decision.target
    );
    if (conflictingDestructive && !allowDestructive) {
      const reason = `conflicting destructive decision exists for target '${decision.target}'`;
      logs.push(logBlocked("safety-enforcer", decision.id, reason));
      blockedDecisionIds.push(decision.id);
      return { success: true, logs, allowed: false, blockedReason: reason, blockedDecisionIds };
    }

    logs.push(logEntry("safety-enforcer", `decision id=${decision.id} PASSED all safety checks`));
    return { success: true, logs, allowed: true, blockedDecisionIds };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logs.push(logEntry("safety-enforcer", `ERROR: ${message}`));
    return { success: false, logs, error: message };
  }
}
