import { buildProviderScores } from "./agents/llm-provider-router.agent.js";
import { selectProvider } from "./agents/provider-selector.agent.js";
import { handleProviderFallback } from "./agents/fallback-handler.agent.js";
import { matchCapabilities } from "./agents/capability-matcher.agent.js";
import { evaluateCost } from "./agents/cost-optimizer.agent.js";
import { evaluateLatency } from "./agents/latency-evaluator.agent.js";

import type { FallbackResult, LLMRequest, RouterState, RoutingDecision } from "./types.js";

import { getProviderConfigs } from "./utils/model-registry.util.js";
import { filterEligibleConfigs } from "./utils/config-loader.util.js";
import { appendLogs, createLog } from "./utils/logger.util.js";

import { appendRequestHistory, getRouterState, updateRouterState } from "./state.js";

function shouldUseFallback(request: LLMRequest, decision: RoutingDecision): boolean {
  if (!decision.success) return true;
  const failedProviders = new Set(request.failedProviders ?? []);
  return failedProviders.has(decision.provider);
}

function updateStateFromDecision(
  prev: RouterState,
  decision: RoutingDecision,
): RouterState {
  const nextFallbackCount = prev.fallbackCount + (decision.fallbackUsed ? 1 : 0);
  const nextLatency = decision.success ? prev.avgLatency : prev.avgLatency;

  const providerKey = `${decision.provider}:${decision.model}`;
  const nextCostStats = {
    ...prev.costStats,
    [providerKey]: (prev.costStats[providerKey] ?? 0) + 1,
  };

  return Object.freeze({
    lastSelectedProvider: providerKey,
    requestHistory: prev.requestHistory,
    fallbackCount: nextFallbackCount,
    avgLatency: nextLatency,
    costStats: Object.freeze(nextCostStats),
  });
}

export function routeLLMRequest(request: LLMRequest): RoutingDecision {
  const logs: readonly string[] = Object.freeze([createLog("orchestrator", `routing task=${request.task}`)]);
  const configs = filterEligibleConfigs(getProviderConfigs(), request.preferredProviders, request.excludedProviders);

  if (configs.length === 0) {
    const output = Object.freeze({
      success: false,
      provider: "",
      model: "",
      reason: "No eligible providers after applying constraints",
      fallbackUsed: false,
      logs: appendLogs(logs, Object.freeze([createLog("orchestrator", "no eligible providers")])) as readonly string[],
      error: "NO_ELIGIBLE_PROVIDER",
    });
    appendRequestHistory(output);
    return output;
  }

  const capability = matchCapabilities(request, configs);
  const cost = evaluateCost(request, configs);
  const latency = evaluateLatency(request, configs);
  const scores = buildProviderScores(request, configs, capability, cost, latency);

  const rankedScores = Object.freeze([...scores].sort((a, b) => b.weightedScore - a.weightedScore));
  const selected = selectProvider(rankedScores);

  const primaryDecision: RoutingDecision = shouldUseFallback(request, selected)
    ? Object.freeze({
      ...selected,
      success: false,
      error: selected.error ?? "PRIMARY_PROVIDER_FAILED",
      logs: appendLogs(selected.logs, Object.freeze([createLog("orchestrator", "primary provider marked failed by request context")])),
    })
    : selected;

  const fallbackResult: FallbackResult = handleProviderFallback(primaryDecision, rankedScores);

  const combinedLogs = appendLogs(
    appendLogs(logs, capability.notes),
    appendLogs(cost.notes, appendLogs(latency.notes, fallbackResult.logs)),
  );

  const output = Object.freeze({
    success: fallbackResult.success,
    provider: fallbackResult.provider,
    model: fallbackResult.model,
    reason: fallbackResult.reason,
    fallbackUsed: fallbackResult.fallbackUsed,
    logs: combinedLogs,
    error: fallbackResult.error,
  });

  const currentState = getRouterState();
  const nextState = updateStateFromDecision(currentState, output);
  updateRouterState(nextState);
  appendRequestHistory(output);

  return output;
}

export function getBestProvider(request: LLMRequest): { provider: string; model: string } {
  const decision = routeLLMRequest(request);
  return Object.freeze({ provider: decision.provider, model: decision.model });
}

export function handleFallback(request: LLMRequest): FallbackResult {
  const decision = routeLLMRequest({
    ...request,
    failedProviders: Object.freeze([
      ...(request.failedProviders ?? []),
      getRouterState().lastSelectedProvider.split(":")[0] ?? "",
    ]),
  });

  return Object.freeze({
    success: decision.success,
    provider: decision.provider,
    model: decision.model,
    reason: decision.reason,
    fallbackUsed: decision.fallbackUsed,
    logs: decision.logs,
    error: decision.error,
  });
}
