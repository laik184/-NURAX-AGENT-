export type BuilderStatus = "IDLE" | "RUNNING" | "COMPLETE" | "FAILED";

export interface ContextSourceFile {
  readonly path: string;
  readonly content: string;
}

export interface BuildContextInput {
  readonly query: string;
  readonly files: readonly ContextSourceFile[];
  readonly maxTokens: number;
  readonly maxFiles?: number;
  readonly includeDependencies?: boolean;
}

export interface ContextChunk {
  readonly id: string;
  readonly path: string;
  readonly content: string;
  readonly startLine: number;
  readonly endLine: number;
  readonly estimatedTokens: number;
}

export interface ContextScore {
  readonly path: string;
  readonly score: number;
  readonly reasons: readonly string[];
}

export interface RankedContext {
  readonly chunk: Readonly<ContextChunk>;
  readonly score: number;
  readonly rank: number;
}

export interface ContextResult {
  readonly success: boolean;
  readonly context: readonly Readonly<RankedContext>[];
  readonly tokenUsage: number;
  readonly logs: readonly string[];
  readonly error?: string;
}

export interface BuildContextState {
  readonly query: string;
  readonly selectedFiles: readonly string[];
  readonly rankedContext: readonly Readonly<RankedContext>[];
  readonly tokenUsage: number;
  readonly status: BuilderStatus;
  readonly logs: readonly string[];
  readonly errors: readonly string[];
}
