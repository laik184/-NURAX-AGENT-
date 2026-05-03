import type { NormalizedDecision, Conflict, EvaluationScore, GovernorOutput } from "../types";
import { logEntry } from "../utils/logger.util";
import { deepFreeze } from "../utils/deep-freeze.util";

export interface FinalizerOutput {
  success: boolean;
  logs: string[];
  error?: string;
  output?: GovernorOutput;
}

export function finalize(
  sessionId: string,
  decision: NormalizedDecision,
  conflicts: Conflict[],
  scores: EvaluationScore[],
  blockedDecisionIds: string[],
  allLogs: string[]
): FinalizerOutput {
  const logs: string[] = [];

  try {
    logs.push(logEntry("finalizer", `assembling final output for session=${sessionId} decision=${decision.id}`));

    const winnerScore = scores.find((s) => s.decisionId === decision.id);

    const rationale = [
      `Selected decision id=${decision.id} from source '${decision.source}'.`,
      `Action: '${decision.action}' targeting '${decision.target}'.`,
      `Composite score: ${(winnerScore?.compositeScore ?? 0).toFixed(3)}.`,
      `Risk level: ${decision.riskLevel}. Confidence: ${decision.normalizedConfidence.toFixed(3)}.`,
      conflicts.length > 0
        ? `Resolved ${conflicts.length} conflict(s): ${conflicts.map((c) => c.type).join(", ")}.`
        : "No conflicts detected.",
      blockedDecisionIds.length > 0
        ? `Blocked ${blockedDecisionIds.length} unsafe decision(s).`
        : "All evaluated decisions passed safety checks.",
    ].join(" ");

    const output: GovernorOutput = deepFreeze({
      success: true,
      logs: allLogs,
      data: {
        sessionId,
        finalDecision: {
          id: decision.id,
          source: decision.source,
          action: decision.action,
          target: decision.target,
          payload: decision.payload,
          confidence: decision.confidence,
          priority: decision.priority,
          riskLevel: decision.riskLevel,
          isDestructive: decision.isDestructive,
          timestamp: decision.timestamp,
          metadata: decision.metadata,
        },
        conflicts,
        scores,
        blockedDecisions: blockedDecisionIds,
        rationale,
        resolvedAt: Date.now(),
      },
    });

    logs.push(logEntry("finalizer", `output assembled — action=${decision.action} rationale="${rationale.slice(0, 80)}..."`));
    return { success: true, logs, output };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logs.push(logEntry("finalizer", `ERROR: ${message}`));
    return { success: false, logs, error: message };
  }
}
