import type { ProviderScore, RoutingDecision } from "../types.js";
import { createLog } from "../utils/logger.util.js";

export function selectProvider(scores: readonly ProviderScore[]): RoutingDecision {
  if (scores.length === 0) {
    return Object.freeze({
      success: false,
      provider: "",
      model: "",
      reason: "No provider candidates available",
      fallbackUsed: false,
      logs: Object.freeze([createLog("provider-selector", "no scores available")]),
      error: "NO_PROVIDER_CANDIDATES",
    });
  }

  const sorted = [...scores].sort((a, b) => b.weightedScore - a.weightedScore);
  const best = sorted[0];

  return Object.freeze({
    success: true,
    provider: best.provider,
    model: best.model,
    reason: best.reason,
    fallbackUsed: false,
    logs: Object.freeze([createLog("provider-selector", `selected ${best.provider}:${best.model} score=${best.weightedScore}`)]),
  });
}
