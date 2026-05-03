import { expandDependencies } from "./agents/dependency-expander.agent.js";
import { pruneContext } from "./agents/context-pruner.agent.js";
import { selectTopFiles } from "./agents/context-selector.agent.js";
import { rankContext } from "./agents/ranking-engine.agent.js";
import { scoreRelevance } from "./agents/relevance-scorer.agent.js";
import { createInitialState, transitionState } from "./state.js";
import type { BuildContextInput, ContextResult } from "./types.js";
import { createLogEntry } from "./utils/logger.util.js";
import { chunkTextByLines } from "./utils/text-chunker.util.js";

export function buildContext(input: Readonly<BuildContextInput>): Readonly<ContextResult> {
  let state = createInitialState(input.query);
  state = transitionState(state, { status: "RUNNING", log: createLogEntry("START", "Context build started") });

  try {
    const relevanceScores = scoreRelevance(input.query, input.files);
    state = transitionState(state, { log: createLogEntry("SCORER", `Scored ${relevanceScores.length} file(s)`) });

    const selectedFiles = selectTopFiles(input.files, relevanceScores, input.maxFiles ?? 8);
    state = transitionState(state, {
      selectedFiles: selectedFiles.map((file) => file.path),
      log: createLogEntry("SELECTOR", `Selected ${selectedFiles.length} file(s)`),
    });

    const expandedFiles = input.includeDependencies === false
      ? selectedFiles
      : expandDependencies(selectedFiles, input.files);
    state = transitionState(state, {
      selectedFiles: expandedFiles.map((file) => file.path),
      log: createLogEntry("DEPENDENCY", `Expanded to ${expandedFiles.length} file(s)`),
    });

    const chunks = expandedFiles.flatMap((file) => chunkTextByLines(file.path, file.content));
    const ranked = rankContext(chunks, relevanceScores);
    const pruned = pruneContext(ranked.map((entry) => entry.chunk), input.maxTokens);

    const prunedIds = new Set(pruned.map((chunk) => chunk.id));
    const finalRanked = ranked
      .filter((entry) => prunedIds.has(entry.chunk.id))
      .map((entry, index) => Object.freeze({ ...entry, rank: index + 1 }));

    const tokenUsage = pruned.reduce((sum, chunk) => sum + chunk.estimatedTokens, 0);

    state = transitionState(state, {
      rankedContext: finalRanked,
      tokenUsage,
      status: "COMPLETE",
      log: createLogEntry("RANK", `Ranked ${finalRanked.length} chunk(s) under ${tokenUsage} tokens`),
    });

    const output: ContextResult = {
      success: true,
      context: state.rankedContext,
      tokenUsage: state.tokenUsage,
      logs: state.logs,
    };

    return Object.freeze(output);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown context-builder failure";
    state = transitionState(state, {
      status: "FAILED",
      error: message,
      log: createLogEntry("ERROR", message),
    });

    const output: ContextResult = {
      success: false,
      context: Object.freeze([]),
      tokenUsage: state.tokenUsage,
      logs: state.logs,
      error: state.errors[state.errors.length - 1],
    };

    return Object.freeze(output);
  }
}
