export type LLMTaskType =
  | "code_generation"
  | "analysis"
  | "summarization"
  | "chat"
  | "classification"
  | "reasoning";

export interface LLMRequest {
  readonly task: LLMTaskType;
  readonly input: string;
  readonly maxTokens?: number;
  readonly requiresLowCost?: boolean;
  readonly requiresLowLatency?: boolean;
  readonly contextWindowNeeded?: number;
  readonly preferredProviders?: readonly string[];
  readonly excludedProviders?: readonly string[];
  readonly failedProviders?: readonly string[];
  readonly now?: number;
}

export interface ProviderConfig {
  readonly provider: "openai" | "anthropic" | "gemini" | "ollama";
  readonly model: string;
  readonly capabilities: readonly LLMTaskType[];
  readonly inputCostPer1K: number;
  readonly outputCostPer1K: number;
  readonly avgLatencyMs: number;
  readonly maxContextTokens: number;
  readonly qualityScore: number;
  readonly isLocal: boolean;
}

export interface ProviderScore {
  readonly provider: string;
  readonly model: string;
  readonly capabilityScore: number;
  readonly costScore: number;
  readonly latencyScore: number;
  readonly weightedScore: number;
  readonly estimatedCost: number;
  readonly estimatedLatencyMs: number;
  readonly reason: string;
}

export interface RoutingDecision {
  readonly success: boolean;
  readonly provider: string;
  readonly model: string;
  readonly reason: string;
  readonly fallbackUsed: boolean;
  readonly logs: readonly string[];
  readonly error?: string;
}

export interface FallbackResult {
  readonly success: boolean;
  readonly provider: string;
  readonly model: string;
  readonly reason: string;
  readonly fallbackUsed: boolean;
  readonly logs: readonly string[];
  readonly error?: string;
}

export interface RouterState {
  readonly lastSelectedProvider: string;
  readonly requestHistory: readonly Readonly<RoutingDecision>[];
  readonly fallbackCount: number;
  readonly avgLatency: number;
  readonly costStats: Readonly<Record<string, number>>;
}

export interface CapabilityMatchResult {
  readonly scoresByProvider: Readonly<Record<string, number>>;
  readonly notes: readonly string[];
}

export interface CostEvaluationResult {
  readonly scoresByProvider: Readonly<Record<string, number>>;
  readonly estimatedCostByProvider: Readonly<Record<string, number>>;
  readonly notes: readonly string[];
}

export interface LatencyEvaluationResult {
  readonly scoresByProvider: Readonly<Record<string, number>>;
  readonly estimatedLatencyByProvider: Readonly<Record<string, number>>;
  readonly notes: readonly string[];
}
