import type { NormalizedDecision, EvaluationScore } from "../types";
import { priorityToScore, weightedComposite } from "../utils/scoring.util";
import { logScore, logEntry } from "../utils/logger.util";

export interface PriorityEvaluatorOutput {
  success: boolean;
  logs: string[];
  error?: string;
  priorityScores?: Map<string, number>;
}

const SOURCE_AUTHORITY: Record<string, number> = {
  "recovery": 1.0,
  "priority-engine": 0.95,
  "decision-engine": 0.85,
  "planning": 0.75,
  "self-improvement": 0.65,
  "router": 0.60,
  "external": 0.50,
};

const ACTION_URGENCY: Record<string, number> = {
  abort: 1.0,
  escalate: 0.90,
  retry: 0.80,
  execute: 0.75,
  defer: 0.40,
  optimize: 0.60,
  cache: 0.55,
  refactor: 0.50,
};

export function evaluatePriority(decisions: NormalizedDecision[]): PriorityEvaluatorOutput {
  const logs: string[] = [];

  try {
    logs.push(logEntry("priority-evaluator", `evaluating priority for ${decisions.length} decision(s)`));
    const priorityScores = new Map<string, number>();

    for (const d of decisions) {
      const normalizedPriorityScore = priorityToScore(d.priority);
      const authorityScore = SOURCE_AUTHORITY[d.source] ?? 0.5;
      const urgencyScore = ACTION_URGENCY[d.action] ?? 0.5;
      const recencyScore = Math.min(1, 1 - (Date.now() - d.timestamp) / (1000 * 60 * 60));

      const composite = weightedComposite([
        { value: normalizedPriorityScore, weight: 0.35 },
        { value: authorityScore, weight: 0.30 },
        { value: urgencyScore, weight: 0.25 },
        { value: Math.max(0, recencyScore), weight: 0.10 },
      ]);

      priorityScores.set(d.id, composite);
      logs.push(logScore("priority-evaluator", d.id, {
        normalizedPriority: normalizedPriorityScore,
        authority: authorityScore,
        urgency: urgencyScore,
        recency: Math.max(0, recencyScore),
        composite,
      }));
    }

    return { success: true, logs, priorityScores };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logs.push(logEntry("priority-evaluator", `ERROR: ${message}`));
    return { success: false, logs, error: message };
  }
}
