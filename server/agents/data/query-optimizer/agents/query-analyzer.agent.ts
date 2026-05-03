import { transitionState } from "../state.js";
import type { AgentResult, Query, QueryAnalysis, QueryOptimizerState } from "../types.js";
import { buildLog } from "../utils/logger.util.js";
import { analyzeQueryStructure } from "../utils/query-parser.util.js";
import { isHighCost } from "../utils/cost-estimator.util.js";

const SOURCE = "query-analyzer";

export interface QueryAnalyzerInput {
  readonly queries: readonly Query[];
  readonly state: Readonly<QueryOptimizerState>;
}

export interface QueryAnalyzerOutput {
  readonly nextState: Readonly<QueryOptimizerState>;
  readonly output: ReturnType<typeof buildAnalyzerOutput>;
  readonly analyses: readonly QueryAnalysis[];
}

function buildAnalyzerOutput(
  analyses: readonly QueryAnalysis[],
  logs: readonly string[],
) {
  return Object.freeze({
    success: true,
    issues: Object.freeze([]),
    suggestions: Object.freeze([]),
    indexSuggestions: Object.freeze([]),
    analyses,
    logs,
  });
}

export function analyzeQueries(input: QueryAnalyzerInput): Readonly<AgentResult & { analyses: readonly QueryAnalysis[] }> {
  const { queries, state } = input;

  if (queries.length === 0) {
    const log = buildLog(SOURCE, "no queries provided for analysis");
    return {
      nextState: transitionState(state, { appendLog: log }),
      output: Object.freeze({ success: true, issues: [], suggestions: [], indexSuggestions: [], logs: [log] }),
      analyses: Object.freeze([]),
    };
  }

  const analyses = queries.map((q) => analyzeQueryStructure(q));
  const highCostCount = analyses.filter((a) => isHighCost(a.estimatedCost)).length;

  const log = buildLog(
    SOURCE,
    `Analyzed ${analyses.length} queries: ${highCostCount} high-cost, ` +
    `${analyses.filter((a) => a.hasJoin).length} with JOIN, ` +
    `${analyses.filter((a) => !a.hasWhere && a.type === "SELECT").length} without WHERE`,
  );

  return {
    nextState: transitionState(state, {
      queries: Object.freeze(queries),
      appendLog: log,
    }),
    output: Object.freeze({
      success: true,
      issues: Object.freeze([]),
      suggestions: Object.freeze([]),
      indexSuggestions: Object.freeze([]),
      logs: Object.freeze([log]),
    }),
    analyses: Object.freeze(analyses),
  };
}
