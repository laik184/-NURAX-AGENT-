import type { CapabilityMatchResult, LLMRequest, ProviderConfig } from "../types.js";
import { createLog } from "../utils/logger.util.js";
import { getProviderKey } from "../utils/model-registry.util.js";

function taskPriorityProvider(task: LLMRequest["task"]): readonly string[] {
  if (task === "code_generation") return Object.freeze(["anthropic", "openai", "ollama", "gemini"]);
  if (task === "summarization") return Object.freeze(["gemini", "openai", "anthropic", "ollama"]);
  if (task === "analysis") return Object.freeze(["openai", "anthropic", "gemini", "ollama"]);
  if (task === "reasoning") return Object.freeze(["openai", "anthropic", "gemini", "ollama"]);
  return Object.freeze(["openai", "anthropic", "gemini", "ollama"]);
}

export function matchCapabilities(
  request: LLMRequest,
  configs: readonly ProviderConfig[],
): CapabilityMatchResult {
  const providerPriority = taskPriorityProvider(request.task);
  const notes: string[] = [];
  const scoresByProvider: Record<string, number> = {};

  for (const config of configs) {
    const supportsTask = config.capabilities.includes(request.task);
    const key = getProviderKey(config);
    const providerRank = providerPriority.indexOf(config.provider);
    const rankBonus = providerRank === -1 ? 0 : Math.max(0.1, 0.4 - (providerRank * 0.1));

    const contextNeed = request.contextWindowNeeded ?? 0;
    const contextScore = contextNeed > 0
      ? Math.min(1, config.maxContextTokens / Math.max(contextNeed, 1))
      : 1;

    const score = supportsTask ? Math.min(1, 0.6 + rankBonus + (0.2 * contextScore)) : 0.05;
    scoresByProvider[key] = Number(score.toFixed(4));

    notes.push(createLog("capability-matcher", `${key} supportsTask=${supportsTask} score=${scoresByProvider[key]}`));
  }

  return Object.freeze({
    scoresByProvider: Object.freeze(scoresByProvider),
    notes:            Object.freeze(notes),
  });
}
