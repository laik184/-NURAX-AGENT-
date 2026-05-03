import type { NormalizedDecision } from "../types";
import { weightedComposite, clamp } from "../utils/scoring.util";
import { logScore, logEntry } from "../utils/logger.util";

export interface ConfidenceEvaluatorOutput {
  success: boolean;
  logs: string[];
  error?: string;
  confidenceScores?: Map<string, number>;
}

const PAYLOAD_DEPTH_BONUS = 0.05;
const METADATA_BONUS = 0.03;
const MAX_PAYLOAD_BONUS = 0.10;

function payloadCompleteness(payload: Readonly<Record<string, unknown>>): number {
  const keys = Object.keys(payload).length;
  if (keys === 0) return 0;
  return clamp(Math.min(keys * PAYLOAD_DEPTH_BONUS, MAX_PAYLOAD_BONUS) + 0.5);
}

function metadataBonus(metadata: Readonly<Record<string, unknown>>): number {
  return Object.keys(metadata).length > 0 ? METADATA_BONUS : 0;
}

export function evaluateConfidence(decisions: NormalizedDecision[]): ConfidenceEvaluatorOutput {
  const logs: string[] = [];

  try {
    logs.push(logEntry("confidence-evaluator", `evaluating confidence for ${decisions.length} decision(s)`));
    const confidenceScores = new Map<string, number>();

    for (const d of decisions) {
      const rawConfidence = d.normalizedConfidence;
      const completeness = payloadCompleteness(d.payload);
      const mdBonus = metadataBonus(d.metadata);

      const ageMs = Date.now() - d.timestamp;
      const freshnessScore = clamp(1 - ageMs / (1000 * 60 * 30));

      const composite = weightedComposite([
        { value: rawConfidence, weight: 0.60 },
        { value: completeness, weight: 0.20 },
        { value: freshnessScore, weight: 0.15 },
        { value: clamp(rawConfidence + mdBonus), weight: 0.05 },
      ]);

      confidenceScores.set(d.id, composite);
      logs.push(logScore("confidence-evaluator", d.id, {
        rawConfidence,
        completeness,
        freshness: freshnessScore,
        metadataBonus: mdBonus,
        composite,
      }));
    }

    return { success: true, logs, confidenceScores };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logs.push(logEntry("confidence-evaluator", `ERROR: ${message}`));
    return { success: false, logs, error: message };
  }
}
