import { initialEmbeddingsState } from './state.js';
import {
  indexEmbeddingsOrchestration,
  runEmbeddingsOrchestrator,
  searchStoredEmbeddings,
} from './orchestrator.js';
import type {
  EmbeddingEngineInput,
  EmbeddingProvider,
  EmbeddingsEngineState,
  EmbeddingsOutput,
  SearchQuery,
  SearchResult,
} from './types.js';

export async function generateEmbeddings(
  input: EmbeddingEngineInput,
  provider: EmbeddingProvider,
  state: EmbeddingsEngineState = initialEmbeddingsState,
): Promise<Readonly<{ state: EmbeddingsEngineState; output: EmbeddingsOutput }>> {
  return runEmbeddingsOrchestrator(input, provider, state);
}

export async function indexEmbeddings(
  input: Omit<EmbeddingEngineInput, 'query'>,
  provider: EmbeddingProvider,
  state: EmbeddingsEngineState = initialEmbeddingsState,
): Promise<Readonly<{ state: EmbeddingsEngineState; output: EmbeddingsOutput }>> {
  return indexEmbeddingsOrchestration(input, provider, state);
}

export async function searchEmbeddings(
  query: SearchQuery,
  provider: EmbeddingProvider,
  state: EmbeddingsEngineState = initialEmbeddingsState,
): Promise<Readonly<{ output: EmbeddingsOutput; results: readonly SearchResult[] }>> {
  const results = await searchStoredEmbeddings(query, provider, state.vectors);

  const output: EmbeddingsOutput = Object.freeze({
    success: true,
    results,
    logs: state.logs,
  });

  return Object.freeze({ output, results });
}
