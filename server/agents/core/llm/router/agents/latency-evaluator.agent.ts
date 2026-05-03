import type { LatencyEvaluationResult, LLMRequest, ProviderConfig } from "../types.js";
import { createLog } from "../utils/logger.util.js";
import { getProviderKey } from "../utils/model-registry.util.js";
import { normalizeLatencyScore } from "../utils/scoring-engine.util.js";

export function evaluateLatency(
  request: LLMRequest,
  configs: readonly ProviderConfig[],
): LatencyEvaluationResult {
  const notes: string[] = [];
  const scoresByProvider: Record<string, number> = {};
  const estimatedLatencyByProvider: Record<string, number> = {};

  const latencies: number[] = [];

  for (const config of configs) {
    const key = getProviderKey(config);
    const speedBias = request.requiresLowLatency ? 0.8 : 1;
    const estimatedLatency = config.avgLatencyMs * speedBias;
    estimatedLatencyByProvider[key] = Number(estimatedLatency.toFixed(2));
    latencies.push(estimatedLatency);
  }

  const maxLatency = Math.max(...latencies, 1);

  for (const config of configs) {
    const key = getProviderKey(config);
    const score = normalizeLatencyScore(estimatedLatencyByProvider[key], maxLatency);
    scoresByProvider[key] = Number(score.toFixed(4));
    notes.push(createLog("latency-evaluator", `${key} estimatedLatencyMs=${estimatedLatencyByProvider[key]} score=${scoresByProvider[key]}`));
  }

  return Object.freeze({
    scoresByProvider: Object.freeze(scoresByProvider),
    estimatedLatencyByProvider: Object.freeze(estimatedLatencyByProvider),
    notes: Object.freeze(notes),
  });
}
