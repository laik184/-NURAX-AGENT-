import { chunkContent } from './agents/chunking.agent.js';
import { generateChunkEmbeddings } from './agents/embedding-generator.agent.js';
import { buildIndexMap } from './agents/indexing.agent.js';
import { rankResults } from './agents/ranking.agent.js';
import { similaritySearch } from './agents/similarity-search.agent.js';
import { getAllVectors, upsertVectors } from './agents/vector-store.agent.js';
import { initialEmbeddingsState } from './state.js';
import type {
  EmbeddingEngineInput,
  EmbeddingProvider,
  EmbeddingVector,
  EmbeddingsEngineState,
  EmbeddingsOutput,
  SearchQuery,
  SearchResult,
} from './types.js';
import { appendLog, createLog } from './utils/logger.util.js';

const DEFAULT_MAX_TOKENS = 256;
const DEFAULT_OVERLAP_TOKENS = 32;
const DEFAULT_TOP_K = 5;
const DEFAULT_THRESHOLD = 0;
const DEFAULT_BATCH_SIZE = 16;

function toOutput(
  success: boolean,
  results: readonly SearchResult[],
  logs: readonly string[],
  error?: string,
): EmbeddingsOutput {
  return Object.freeze({
    success,
    results,
    logs,
    ...(error ? { error } : {}),
  });
}

export async function runEmbeddingsOrchestrator(
  input: EmbeddingEngineInput,
  provider: EmbeddingProvider,
  previousState: EmbeddingsEngineState = initialEmbeddingsState,
): Promise<Readonly<{ state: EmbeddingsEngineState; output: EmbeddingsOutput }>> {
  let logs = appendLog(previousState.logs, createLog('orchestrator', 'started'));

  try {
    const chunks = chunkContent(
      input.content,
      input.maxTokensPerChunk ?? DEFAULT_MAX_TOKENS,
      input.overlapTokens ?? DEFAULT_OVERLAP_TOKENS,
    );

    logs = appendLog(logs, createLog('chunking', `generated ${chunks.length} chunks`));

    const chunkVectors = await generateChunkEmbeddings(
      chunks,
      provider,
      input.embeddingBatchSize ?? DEFAULT_BATCH_SIZE,
    );

    logs = appendLog(logs, createLog('embedding-generator', 'generated chunk vectors'));

    const indexed = buildIndexMap(chunks);
    const incomingVectors: EmbeddingVector[] = chunks.map((chunk) =>
      Object.freeze({
        id: chunk.id,
        chunkId: chunk.id,
        content: chunk.content,
        values: chunkVectors.get(chunk.id) ?? Object.freeze([]),
      }),
    );
    const storedVectors = upsertVectors(previousState.vectors, incomingVectors);

    logs = appendLog(logs, createLog('vector-store', `stored ${storedVectors.length} vectors`));

    let finalResults = previousState.results;
    let lastQuery = previousState.lastQuery;

    if (input.query) {
      const queryResults = await searchStoredEmbeddings(input.query, provider, storedVectors);
      finalResults = rankResults(queryResults, input.query.threshold ?? DEFAULT_THRESHOLD);
      lastQuery = input.query.text;
      logs = appendLog(logs, createLog('similarity-search', `returned ${finalResults.length} ranked results`));
    }

    const nextState: EmbeddingsEngineState = Object.freeze({
      vectors: storedVectors,
      indexMap: indexed,
      lastQuery,
      results: finalResults,
      status: 'DONE',
      logs,
      errors: previousState.errors,
    });

    const output = Object.freeze({
      success: true,
      results: finalResults,
      logs,
    });

    return Object.freeze({ state: nextState, output });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown embeddings error';
    logs = appendLog(logs, createLog('error', message));

    const nextState: EmbeddingsEngineState = Object.freeze({
      ...previousState,
      status: 'FAILED',
      logs,
      errors: Object.freeze([...previousState.errors, message]),
    });

    return Object.freeze({
      state: nextState,
      output: toOutput(false, [], logs, message),
    });
  }
}

export async function indexEmbeddingsOrchestration(
  input: Omit<EmbeddingEngineInput, 'query'>,
  provider: EmbeddingProvider,
  previousState: EmbeddingsEngineState = initialEmbeddingsState,
): Promise<Readonly<{ state: EmbeddingsEngineState; output: EmbeddingsOutput }>> {
  return runEmbeddingsOrchestrator({ ...input }, provider, previousState);
}

export async function searchStoredEmbeddings(
  query: SearchQuery,
  provider: EmbeddingProvider,
  vectors: readonly EmbeddingVector[],
): Promise<readonly ReturnType<typeof similaritySearch>[number][]> {
  const queryVector = await provider.embed([query.text]);
  const firstVector = queryVector[0] ?? [];

  return similaritySearch(firstVector, getAllVectors(vectors), query.topK ?? DEFAULT_TOP_K);
}
