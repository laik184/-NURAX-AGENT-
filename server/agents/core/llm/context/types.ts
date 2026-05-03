export type CompressionStatus = "IDLE" | "PROCESSING" | "DONE" | "FAILED";

export interface TokenEstimate {
  readonly tokens: number;
  readonly characters: number;
  readonly method: "heuristic-char-ratio";
}

export interface ContextChunk {
  readonly id: string;
  readonly content: string;
  readonly startOffset: number;
  readonly endOffset: number;
  readonly tokenEstimate: number;
  readonly importanceScore?: number;
}

export interface CompressionConfig {
  readonly maxTokens: number;
  readonly targetReductionRatio?: number;
  readonly chunkSize?: number;
  readonly chunkOverlap?: number;
  readonly summaryMaxTokens?: number;
}

export interface CompressionResult {
  readonly success: boolean;
  readonly compressedContext: string;
  readonly originalTokens: number;
  readonly finalTokens: number;
  readonly ratio: number;
  readonly logs: readonly string[];
  readonly error?: string;
}

export interface CompressionState {
  readonly originalSize: number;
  readonly compressedSize: number;
  readonly compressionRatio: number;
  readonly chunks: readonly ContextChunk[];
  readonly selectedChunks: readonly ContextChunk[];
  readonly status: CompressionStatus;
  readonly logs: readonly string[];
  readonly errors: readonly string[];
}

export interface CompressionStats {
  readonly originalSize: number;
  readonly compressedSize: number;
  readonly compressionRatio: number;
  readonly status: CompressionStatus;
}
