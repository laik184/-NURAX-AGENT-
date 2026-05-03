import { analyzeQueries } from "./agents/query-analyzer.agent.js";
import { detectSlowQueries } from "./agents/slow-query-detector.agent.js";
import { detectNPlusOne } from "./agents/n-plus-one-detector.agent.js";
import { analyzeExecutionPlans } from "./agents/execution-plan-analyzer.agent.js";
import { suggestIndexes } from "./agents/index-suggester.agent.js";
import { generateRecommendations } from "./agents/optimization-recommender.agent.js";
import { INITIAL_STATE, transitionState } from "./state.js";
import type {
  AgentResult,
  OptimizationIssue,
  OptimizationReport,
  Query,
  QueryOptimizerState,
} from "./types.js";
import { buildError, buildLog } from "./utils/logger.util.js";
import { parseQueryBatch } from "./utils/query-parser.util.js";

const SOURCE = "orchestrator";

function fail(
  state: Readonly<QueryOptimizerState>,
  error: string,
  message: string,
): Readonly<AgentResult> {
  return {
    nextState: transitionState(state, {
      status: "FAILED",
      appendError: buildError(SOURCE, message),
      appendLog: buildLog(SOURCE, message),
    }),
    output: Object.freeze({
      success: false,
      issues: Object.freeze([]),
      suggestions: Object.freeze([]),
      indexSuggestions: Object.freeze([]),
      logs: Object.freeze([buildLog(SOURCE, message)]),
      error,
    }),
  };
}

export function optimizeQueries(
  queries: readonly Query[],
  currentState: Readonly<QueryOptimizerState> = INITIAL_STATE,
): Readonly<AgentResult> {
  if (queries.length === 0) {
    return fail(currentState, "no_queries", "At least one query is required");
  }

  let state = transitionState(currentState, { status: "ANALYZING" });

  const analyzerResult = analyzeQueries({ queries, state });
  state = analyzerResult.nextState;
  const { analyses } = analyzerResult;

  const slowResult = detectSlowQueries({ queries, state });
  state = slowResult.nextState;

  const nPlusResult = detectNPlusOne({ queries, state });
  state = nPlusResult.nextState;

  const planResult = analyzeExecutionPlans({ analyses, state });
  state = planResult.nextState;

  const indexResult = suggestIndexes({ analyses, state });
  state = indexResult.nextState;

  const allIssues: readonly OptimizationIssue[] = Object.freeze([
    ...slowResult.output.issues,
    ...nPlusResult.output.issues,
    ...planResult.planIssues,
  ]);

  const recResult = generateRecommendations({
    analyses,
    issues: allIssues,
    indexSuggestions: indexResult.output.indexSuggestions,
    plans: planResult.plans,
    state,
  });
  state = recResult.nextState;

  const log = buildLog(
    SOURCE,
    `Optimization complete: ${queries.length} queries, ${allIssues.length} issue(s), ` +
    `${recResult.output.suggestions.length} recommendation(s), ` +
    `${indexResult.output.indexSuggestions.length} index suggestion(s)`,
  );

  const finalReport: OptimizationReport = Object.freeze({
    success: true,
    issues: allIssues,
    suggestions: recResult.output.suggestions,
    indexSuggestions: indexResult.output.indexSuggestions,
    logs: Object.freeze([
      ...analyzerResult.output.logs,
      ...slowResult.output.logs,
      ...nPlusResult.output.logs,
      ...planResult.output.logs,
      ...indexResult.output.logs,
      ...recResult.output.logs,
      log,
    ]),
  });

  return {
    nextState: transitionState(state, { status: "COMPLETED", appendLog: log }),
    output: finalReport,
  };
}

export function analyzeQuery(
  sql: string,
  executionTimeMs = 0,
  currentState: Readonly<QueryOptimizerState> = INITIAL_STATE,
): Readonly<AgentResult> {
  if (!sql || sql.trim() === "") {
    return fail(currentState, "invalid_sql", "SQL string must not be empty");
  }

  const [query] = parseQueryBatch([sql], [executionTimeMs]);
  return optimizeQueries([query!], currentState);
}

export function getOptimizationReport(
  sqls: readonly string[],
  executionTimesMs?: readonly number[],
  currentState: Readonly<QueryOptimizerState> = INITIAL_STATE,
): Readonly<AgentResult> {
  if (sqls.length === 0) {
    return fail(currentState, "no_queries", "At least one SQL string is required");
  }

  const queries = parseQueryBatch(sqls, executionTimesMs);
  return optimizeQueries(queries, currentState);
}
