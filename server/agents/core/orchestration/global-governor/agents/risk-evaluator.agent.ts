import type { NormalizedDecision } from "../types";
import { riskToScore, weightedComposite } from "../utils/scoring.util";
import { logScore, logEntry } from "../utils/logger.util";

export interface RiskEvaluatorOutput {
  success: boolean;
  logs: string[];
  error?: string;
  riskScores?: Map<string, number>;
}

const DESTRUCTIVE_PENALTY = 0.25;

const ACTION_RISK_MODIFIER: Record<string, number> = {
  abort: 0.10,
  escalate: 0.20,
  retry: 0.85,
  execute: 0.80,
  defer: 0.95,
  optimize: 0.80,
  cache: 0.90,
  refactor: 0.60,
};

const SOURCE_TRUST: Record<string, number> = {
  "recovery": 0.95,
  "priority-engine": 0.90,
  "decision-engine": 0.85,
  "planning": 0.80,
  "self-improvement": 0.75,
  "router": 0.70,
  "external": 0.50,
};

export function evaluateRisk(decisions: NormalizedDecision[]): RiskEvaluatorOutput {
  const logs: string[] = [];

  try {
    logs.push(logEntry("risk-evaluator", `evaluating risk for ${decisions.length} decision(s)`));
    const riskScores = new Map<string, number>();

    for (const d of decisions) {
      const baseRiskScore = riskToScore(d.riskLevel);
      const actionModifier = ACTION_RISK_MODIFIER[d.action] ?? 0.7;
      const trustScore = SOURCE_TRUST[d.source] ?? 0.6;
      const destructivePenalty = d.isDestructive ? DESTRUCTIVE_PENALTY : 0;

      const rawComposite = weightedComposite([
        { value: baseRiskScore, weight: 0.45 },
        { value: actionModifier, weight: 0.30 },
        { value: trustScore, weight: 0.25 },
      ]);

      const finalScore = Math.max(0, Math.round((rawComposite - destructivePenalty) * 1000) / 1000);

      riskScores.set(d.id, finalScore);
      logs.push(logScore("risk-evaluator", d.id, {
        baseRisk: baseRiskScore,
        actionModifier,
        trust: trustScore,
        destructivePenalty,
        final: finalScore,
      }));
    }

    return { success: true, logs, riskScores };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logs.push(logEntry("risk-evaluator", `ERROR: ${message}`));
    return { success: false, logs, error: message };
  }
}
