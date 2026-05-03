export interface PromptContext {
  readonly id: string;
  readonly content: string;
  readonly priority: number;
  readonly source?: string;
}

export interface PromptInput {
  readonly systemPrompt?: string;
  readonly userInput: string;
  readonly context?: readonly PromptContext[];
  readonly history?: readonly string[];
  readonly tokenLimit?: number;
}

export interface TokenStats {
  readonly estimatedTokens: number;
  readonly limit: number;
  readonly remaining: number;
  readonly truncated: boolean;
}

export interface PromptOutput {
  readonly success: boolean;
  readonly prompt: string;
  readonly tokens: number;
  readonly logs: readonly string[];
  readonly error?: string;
}

export type PromptBuilderStatus = "IDLE" | "BUILDING" | "COMPLETE" | "FAILED";

export interface PromptBuilderState {
  readonly systemPrompt: string;
  readonly userPrompt: string;
  readonly context: readonly PromptContext[];
  readonly finalPrompt: string;
  readonly tokenCount: number;
  readonly status: PromptBuilderStatus;
  readonly logs: readonly string[];
  readonly errors: readonly string[];
}
