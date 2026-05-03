export type EngineStatus = 'IDLE' | 'PROCESSING' | 'DONE' | 'FAILED';

export interface Chunk {
  readonly id: string;
  readonly content: string;
  readonly tokenCount: number;
  readonly startToken: number;
  readonly endToken: number;
}

export interface EmbeddingVector {
  readonly id: string;
  readonly chunkId: string;
  readonly values: readonly number[];
  readonly content: string;
}

export type IndexMap = Readonly<Record<string, string>>;

export interface SearchQuery {
  readonly text: string;
  readonly topK?: number;
  readonly threshold?: number;
}

export interface SearchResult {
  readonly id: string;
  readonly chunkId: string;
  readonly score: number;
  readonly content: string;
}

export interface EmbeddingsEngineState {
  readonly vectors: readonly EmbeddingVector[];
  readonly indexMap: IndexMap;
  readonly lastQuery: string;
  readonly results: readonly SearchResult[];
  readonly status: EngineStatus;
  readonly logs: readonly string[];
  readonly errors: readonly string[];
}

export interface EmbeddingProvider {
  embed(texts: readonly string[]): Promise<readonly (readonly number[])[]>;
}

export interface EmbeddingEngineInput {
  readonly content: string;
  readonly query?: SearchQuery;
  readonly maxTokensPerChunk?: number;
  readonly overlapTokens?: number;
  readonly embeddingBatchSize?: number;
}

export interface EmbeddingsOutput {
  readonly success: boolean;
  readonly results: readonly SearchResult[];
  readonly logs: readonly string[];
  readonly error?: string;
}
