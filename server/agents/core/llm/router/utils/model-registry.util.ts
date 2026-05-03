import type { LLMTaskType, ProviderConfig } from "../types.js";

function tasks(...values: LLMTaskType[]): readonly LLMTaskType[] {
  return Object.freeze(values);
}

const PROVIDER_CONFIGS: readonly ProviderConfig[] = Object.freeze([
  Object.freeze({
    provider:         "openai",
    model:            "gpt-5",
    capabilities:     tasks("code_generation", "analysis", "reasoning", "chat", "summarization", "classification"),
    inputCostPer1K:   0.010,
    outputCostPer1K:  0.030,
    avgLatencyMs:     1200,
    maxContextTokens: 200000,
    qualityScore:     0.96,
    isLocal:          false,
  }),
  Object.freeze({
    provider:         "openai",
    model:            "gpt-4",
    capabilities:     tasks("code_generation", "analysis", "reasoning", "chat", "summarization"),
    inputCostPer1K:   0.008,
    outputCostPer1K:  0.024,
    avgLatencyMs:     900,
    maxContextTokens: 128000,
    qualityScore:     0.92,
    isLocal:          false,
  }),
  Object.freeze({
    provider:         "anthropic",
    model:            "claude-sonnet",
    capabilities:     tasks("code_generation", "analysis", "reasoning", "chat", "summarization", "classification"),
    inputCostPer1K:   0.009,
    outputCostPer1K:  0.027,
    avgLatencyMs:     1100,
    maxContextTokens: 200000,
    qualityScore:     0.95,
    isLocal:          false,
  }),
  Object.freeze({
    provider:         "gemini",
    model:            "gemini-2.5-flash",
    capabilities:     tasks("analysis", "summarization", "chat", "classification"),
    inputCostPer1K:   0.002,
    outputCostPer1K:  0.006,
    avgLatencyMs:     800,
    maxContextTokens: 1000000,
    qualityScore:     0.84,
    isLocal:          false,
  }),
  Object.freeze({
    provider:         "ollama",
    model:            "llama3.1:8b",
    capabilities:     tasks("chat", "summarization", "classification", "code_generation"),
    inputCostPer1K:   0,
    outputCostPer1K:  0,
    avgLatencyMs:     600,
    maxContextTokens: 32768,
    qualityScore:     0.74,
    isLocal:          true,
  }),
]);

export function getProviderConfigs(): readonly ProviderConfig[] {
  return PROVIDER_CONFIGS;
}

export function getProviderKey(config: ProviderConfig): string {
  return `${config.provider}:${config.model}`;
}
