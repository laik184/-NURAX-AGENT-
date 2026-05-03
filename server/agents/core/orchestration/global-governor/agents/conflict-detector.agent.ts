import type { NormalizedDecision, Conflict } from "../types";
import { logEntry, logConflict } from "../utils/logger.util";

export interface ConflictDetectorOutput {
  success: boolean;
  logs: string[];
  error?: string;
  conflicts?: Conflict[];
}

let conflictCounter = 0;
function makeConflictId(): string {
  conflictCounter = (conflictCounter + 1) % 100000;
  return `conflict-${conflictCounter}`;
}

function detectActionClash(a: NormalizedDecision, b: NormalizedDecision): Conflict | null {
  const contradictions: Array<[string, string]> = [
    ["execute", "abort"],
    ["execute", "defer"],
    ["retry", "abort"],
    ["optimize", "refactor"],
    ["cache", "refactor"],
  ];
  for (const [x, y] of contradictions) {
    if (
      (a.action === x && b.action === y) ||
      (a.action === y && b.action === x)
    ) {
      return {
        id: makeConflictId(),
        decisionIds: [a.id, b.id],
        type: "action-clash",
        description: `Contradictory actions: '${a.action}' vs '${b.action}'`,
        severity: "high",
      };
    }
  }
  return null;
}

function detectTargetClash(a: NormalizedDecision, b: NormalizedDecision): Conflict | null {
  if (a.target === b.target && a.action !== b.action && a.target !== "unknown") {
    return {
      id: makeConflictId(),
      decisionIds: [a.id, b.id],
      type: "target-clash",
      description: `Same target '${a.target}' with different actions: '${a.action}' vs '${b.action}'`,
      severity: "medium",
    };
  }
  return null;
}

function detectPriorityClash(a: NormalizedDecision, b: NormalizedDecision): Conflict | null {
  if (Math.abs(a.normalizedPriority - b.normalizedPriority) < 0.01 && a.action !== b.action) {
    return {
      id: makeConflictId(),
      decisionIds: [a.id, b.id],
      type: "priority-clash",
      description: `Identical normalized priority (${a.normalizedPriority.toFixed(3)}) with different actions`,
      severity: "low",
    };
  }
  return null;
}

function detectRiskClash(a: NormalizedDecision, b: NormalizedDecision): Conflict | null {
  const RISK_ORDER: Record<string, number> = { none: 0, low: 1, medium: 2, high: 3, critical: 4 };
  const aRisk = RISK_ORDER[a.riskLevel] ?? 2;
  const bRisk = RISK_ORDER[b.riskLevel] ?? 2;
  if (Math.abs(aRisk - bRisk) >= 3 && a.target === b.target) {
    return {
      id: makeConflictId(),
      decisionIds: [a.id, b.id],
      type: "risk-clash",
      description: `Extreme risk gap on target '${a.target}': '${a.riskLevel}' vs '${b.riskLevel}'`,
      severity: "high",
    };
  }
  return null;
}

export function detectConflicts(decisions: NormalizedDecision[]): ConflictDetectorOutput {
  const logs: string[] = [];

  try {
    logs.push(logEntry("conflict-detector", `scanning ${decisions.length} decision(s) for conflicts`));
    const conflicts: Conflict[] = [];

    for (let i = 0; i < decisions.length; i++) {
      for (let j = i + 1; j < decisions.length; j++) {
        const a = decisions[i];
        const b = decisions[j];

        const checks = [
          detectActionClash(a, b),
          detectTargetClash(a, b),
          detectPriorityClash(a, b),
          detectRiskClash(a, b),
        ];

        for (const c of checks) {
          if (c) {
            conflicts.push(c);
            logs.push(logConflict("conflict-detector", a.id, b.id, c.type));
          }
        }
      }
    }

    if (conflicts.length === 0) {
      logs.push(logEntry("conflict-detector", "no conflicts detected"));
    } else {
      logs.push(logEntry("conflict-detector", `detected ${conflicts.length} conflict(s)`));
    }

    return { success: true, logs, conflicts };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logs.push(logEntry("conflict-detector", `ERROR: ${message}`));
    return { success: false, logs, error: message };
  }
}
