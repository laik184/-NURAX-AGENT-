import type {
  CapabilityMatchResult,
  CostEvaluationResult,
  LatencyEvaluationResult,
  LLMRequest,
  ProviderConfig,
  ProviderScore,
} from "../types.js";

import { getProviderKey } from "../utils/model-registry.util.js";
import { weightedScore } from "../utils/scoring-engine.util.js";

export function buildProviderScores(
  request: LLMRequest,
  configs: readonly ProviderConfig[],
  capability: CapabilityMatchResult,
  cost: CostEvaluationResult,
  latency: LatencyEvaluationResult,
): readonly ProviderScore[] {
  const providerScores: ProviderScore[] = [];

  for (const config of configs) {
    const key = getProviderKey(config);
    const capabilityScore = capability.scoresByProvider[key] ?? 0;
    const costScore = cost.scoresByProvider[key] ?? 0;
    const latencyScore = latency.scoresByProvider[key] ?? 0;

    const score = weightedScore({
      capability: capabilityScore,
      cost: costScore,
      latency: latencyScore,
      quality: config.qualityScore,
      prefersLowCost: Boolean(request.requiresLowCost),
      prefersLowLatency: Boolean(request.requiresLowLatency),
    });

    providerScores.push(Object.freeze({
      provider: config.provider,
      model: config.model,
      capabilityScore,
      costScore,
      latencyScore,
      weightedScore: score,
      estimatedCost: cost.estimatedCostByProvider[key] ?? 0,
      estimatedLatencyMs: latency.estimatedLatencyByProvider[key] ?? 0,
      reason: `capability=${capabilityScore}, cost=${costScore}, latency=${latencyScore}, quality=${config.qualityScore}`,
    }));
  }

  return Object.freeze(providerScores);
}
