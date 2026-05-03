import type { FallbackResult, ProviderScore, RoutingDecision } from "../types.js";
import { createLog } from "../utils/logger.util.js";

export function handleProviderFallback(
  primaryDecision: RoutingDecision,
  rankedScores: readonly ProviderScore[],
): FallbackResult {
  if (primaryDecision.success) {
    return Object.freeze({
      success: true,
      provider: primaryDecision.provider,
      model: primaryDecision.model,
      reason: primaryDecision.reason,
      fallbackUsed: false,
      logs: primaryDecision.logs,
    });
  }

  const alternative = rankedScores.find((score) => `${score.provider}:${score.model}` !== `${primaryDecision.provider}:${primaryDecision.model}`);

  if (!alternative) {
    return Object.freeze({
      success: false,
      provider: "",
      model: "",
      reason: "Fallback unavailable",
      fallbackUsed: false,
      logs: Object.freeze([...primaryDecision.logs, createLog("fallback-handler", "no alternative provider available")]),
      error: primaryDecision.error ?? "FALLBACK_UNAVAILABLE",
    });
  }

  return Object.freeze({
    success: true,
    provider: alternative.provider,
    model: alternative.model,
    reason: `Fallback selected due to primary failure: ${primaryDecision.error ?? "UNKNOWN_ERROR"}`,
    fallbackUsed: true,
    logs: Object.freeze([...primaryDecision.logs, createLog("fallback-handler", `fallback -> ${alternative.provider}:${alternative.model}`)]),
  });
}
