import type { CostEvaluationResult, LLMRequest, ProviderConfig } from "../types.js";
import { createLog } from "../utils/logger.util.js";
import { getProviderKey } from "../utils/model-registry.util.js";
import { normalizeCostScore } from "../utils/scoring-engine.util.js";
import { estimateInputTokens, estimateOutputTokens } from "../utils/token-estimator.util.js";

export function evaluateCost(
  request: LLMRequest,
  configs: readonly ProviderConfig[],
): CostEvaluationResult {
  const notes: string[] = [];
  const scoresByProvider: Record<string, number> = {};
  const estimatedCostByProvider: Record<string, number> = {};

  const inputTokens = estimateInputTokens(request.input);
  const outputTokens = estimateOutputTokens(request.maxTokens);
  const costs: number[] = [];

  for (const config of configs) {
    const key = getProviderKey(config);
    const totalCost = ((inputTokens / 1000) * config.inputCostPer1K) + ((outputTokens / 1000) * config.outputCostPer1K);
    estimatedCostByProvider[key] = Number(totalCost.toFixed(6));
    costs.push(totalCost);
  }

  const maxCost = Math.max(...costs, 0.000001);

  for (const config of configs) {
    const key = getProviderKey(config);
    const score = normalizeCostScore(estimatedCostByProvider[key] / maxCost);
    scoresByProvider[key] = Number(score.toFixed(4));
    notes.push(createLog("cost-optimizer", `${key} estimatedCost=${estimatedCostByProvider[key]} score=${scoresByProvider[key]}`));
  }

  return Object.freeze({
    scoresByProvider: Object.freeze(scoresByProvider),
    estimatedCostByProvider: Object.freeze(estimatedCostByProvider),
    notes: Object.freeze(notes),
  });
}
