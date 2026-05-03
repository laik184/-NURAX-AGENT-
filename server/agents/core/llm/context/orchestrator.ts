import { chunkContext } from "./agents/chunker.agent.js";
import { mergeContext } from "./agents/context-merger.agent.js";
import { deduplicateChunks } from "./agents/deduplicator.agent.js";
import { rankChunksByPriority } from "./agents/priority-ranker.agent.js";
import { filterRelevantContext } from "./agents/relevance-filter.agent.js";
import { summarizeChunks } from "./agents/summarizer.agent.js";
import { createInitialState, transitionState } from "./state.js";
import type { CompressionConfig, CompressionResult, CompressionStats, ContextChunk } from "./types.js";
import { calculateCompressionRatio } from "./utils/compression-ratio.util.js";
import { createLogEntry } from "./utils/logger.util.js";
import { estimateTokens } from "./utils/token-estimator.util.js";

const DEFAULT_CONFIG = Object.freeze({
  maxTokens: 1800,
  targetReductionRatio: 0.55,
  chunkSize: 1800,
  chunkOverlap: 120,
  summaryMaxTokens: 200,
});

let latestStats: CompressionStats = Object.freeze({
  originalSize: 0,
  compressedSize: 0,
  compressionRatio: 0,
  status: "IDLE",
});

export function compressContext(rawContext: string, config?: Readonly<CompressionConfig>): Readonly<CompressionResult> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const originalTokenEstimate = estimateTokens(rawContext).tokens;

  let state = createInitialState(originalTokenEstimate);
  state = transitionState(state, { status: "PROCESSING", log: createLogEntry("START", "Compression started") });

  try {
    const filteredContext = filterRelevantContext(rawContext);
    state = transitionState(state, { log: createLogEntry("FILTER", "Removed irrelevant/noisy content") });

    const chunked = chunkContext(filteredContext, finalConfig.chunkSize, finalConfig.chunkOverlap);
    state = transitionState(state, {
      chunks: chunked,
      log: createLogEntry("CHUNK", `Generated ${chunked.length} chunk(s)`),
    });

    const ranked = rankChunksByPriority(chunked);
    state = transitionState(state, { log: createLogEntry("RANK", "Ranked chunks by importance") });

    const tokenBudget = Math.max(1, Math.floor(finalConfig.maxTokens * finalConfig.targetReductionRatio));
    const selected = selectToBudget(ranked, tokenBudget);
    state = transitionState(state, {
      selectedChunks: selected,
      log: createLogEntry("SELECT", `Selected ${selected.length} chunk(s) within token budget`),
    });

    const summarized = summarizeChunks(selected, finalConfig.summaryMaxTokens);
    state = transitionState(state, { log: createLogEntry("SUMMARIZE", "Summarized oversized chunks") });

    const deduplicated = deduplicateChunks(summarized);
    state = transitionState(state, { log: createLogEntry("DEDUP", `Removed duplicates, ${deduplicated.length} unique chunk(s)`) });

    const merged = mergeContext(deduplicated);
    const finalTokenEstimate = estimateTokens(merged).tokens;
    const ratio = calculateCompressionRatio(originalTokenEstimate, finalTokenEstimate);

    state = transitionState(state, {
      compressedSize: finalTokenEstimate,
      compressionRatio: ratio,
      status: "DONE",
      log: createLogEntry("DONE", "Compression completed successfully"),
    });

    latestStats = Object.freeze({
      originalSize: state.originalSize,
      compressedSize: state.compressedSize,
      compressionRatio: state.compressionRatio,
      status: state.status,
    });

    const output: CompressionResult = {
      success: true,
      compressedContext: merged,
      originalTokens: originalTokenEstimate,
      finalTokens: finalTokenEstimate,
      ratio,
      logs: state.logs,
    };

    return Object.freeze(output);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown compression failure";
    state = transitionState(state, {
      status: "FAILED",
      error: message,
      log: createLogEntry("ERROR", message),
    });

    latestStats = Object.freeze({
      originalSize: state.originalSize,
      compressedSize: state.compressedSize,
      compressionRatio: state.compressionRatio,
      status: state.status,
    });

    const output: CompressionResult = {
      success: false,
      compressedContext: "",
      originalTokens: originalTokenEstimate,
      finalTokens: 0,
      ratio: 0,
      logs: state.logs,
      error: message,
    };

    return Object.freeze(output);
  }
}

export function getCompressionStats(): Readonly<CompressionStats> {
  return latestStats;
}

function selectToBudget(chunks: readonly ContextChunk[], maxTokens: number): readonly ContextChunk[] {
  const selected: ContextChunk[] = [];
  let consumed = 0;

  for (const chunk of chunks) {
    if (consumed + chunk.tokenEstimate > maxTokens && selected.length > 0) {
      break;
    }

    selected.push(chunk);
    consumed += chunk.tokenEstimate;
  }

  return Object.freeze(selected);
}
