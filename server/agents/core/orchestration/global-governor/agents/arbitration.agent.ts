import type { NormalizedDecision, EvaluationScore } from "../types";
import { weightedComposite } from "../utils/scoring.util";
import { logScore, logSelected, logEntry } from "../utils/logger.util";

export interface ArbitrationOutput {
  success: boolean;
  logs: string[];
  error?: string;
  selectedDecision?: NormalizedDecision;
  scores?: EvaluationScore[];
}

export function arbitrate(
  decisions: NormalizedDecision[],
  priorityScores: Map<string, number>,
  riskScores: Map<string, number>,
  confidenceScores: Map<string, number>
): ArbitrationOutput {
  const logs: string[] = [];

  try {
    logs.push(logEntry("arbitration", `arbitrating ${decisions.length} decision(s)`));

    const scores: EvaluationScore[] = decisions.map((d) => {
      const priorityScore = priorityScores.get(d.id) ?? 0;
      const riskScore = riskScores.get(d.id) ?? 0;
      const confidenceScore = confidenceScores.get(d.id) ?? 0;

      const compositeScore = weightedComposite([
        { value: priorityScore, weight: 0.35 },
        { value: riskScore, weight: 0.35 },
        { value: confidenceScore, weight: 0.30 },
      ]);

      logs.push(logScore("arbitration", d.id, {
        priority: priorityScore,
        risk: riskScore,
        confidence: confidenceScore,
        composite: compositeScore,
      }));

      return {
        decisionId: d.id,
        priorityScore,
        riskScore,
        confidenceScore,
        compositeScore,
      };
    });

    scores.sort((a, b) => b.compositeScore - a.compositeScore);
    const winner = scores[0];

    if (!winner) {
      return { success: false, logs, error: "arbitration found no scoreable decisions" };
    }

    const selectedDecision = decisions.find((d) => d.id === winner.decisionId);
    if (!selectedDecision) {
      return { success: false, logs, error: `winning decision id=${winner.decisionId} not found in input set` };
    }

    logs.push(logSelected("arbitration", winner.decisionId, winner.compositeScore));

    return { success: true, logs, selectedDecision, scores };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logs.push(logEntry("arbitration", `ERROR: ${message}`));
    return { success: false, logs, error: message };
  }
}
