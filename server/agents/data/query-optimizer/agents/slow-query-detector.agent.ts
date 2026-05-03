import { transitionState } from "../state.js";
import type { AgentResult, OptimizationIssue, Query, QueryOptimizerState } from "../types.js";
import { buildError, buildLog } from "../utils/logger.util.js";
import { isSlowQuery, getSlowQueryThreshold } from "../utils/cost-estimator.util.js";

const SOURCE = "slow-query-detector";

export interface SlowQueryDetectorInput {
  readonly queries: readonly Query[];
  readonly state: Readonly<QueryOptimizerState>;
  readonly thresholdMs?: number;
}

export function detectSlowQueries(input: SlowQueryDetectorInput): Readonly<AgentResult> {
  const { queries, state } = input;
  const threshold = input.thresholdMs ?? getSlowQueryThreshold();

  if (queries.length === 0) {
    const log = buildLog(SOURCE, "no queries to evaluate");
    return {
      nextState: transitionState(state, { appendLog: log }),
      output: Object.freeze({ success: true, issues: [], suggestions: [], indexSuggestions: [], logs: [log] }),
    };
  }

  const slowQueries = queries.filter((q) => isSlowQuery(q.executionTimeMs) || q.executionTimeMs >= threshold);

  const issues: OptimizationIssue[] = slowQueries.map((q) =>
    Object.freeze({
      queryId: q.id,
      type: "SLOW_QUERY" as const,
      severity: q.executionTimeMs >= threshold * 5 ? ("CRITICAL" as const) : ("HIGH" as const),
      description: `Query exceeded ${threshold}ms threshold: ${q.executionTimeMs}ms`,
      affectedTable: q.table,
    }),
  );

  const log = buildLog(SOURCE, `Detected ${slowQueries.length}/${queries.length} slow queries (threshold=${threshold}ms)`);

  if (slowQueries.length > 0) {
    const errorLog = buildError(SOURCE, `${slowQueries.length} slow queries found`);
    return {
      nextState: transitionState(state, {
        slowQueries: Object.freeze(slowQueries),
        appendLog: log,
        appendError: errorLog,
      }),
      output: Object.freeze({
        success: true,
        issues: Object.freeze(issues),
        suggestions: Object.freeze([]),
        indexSuggestions: Object.freeze([]),
        logs: Object.freeze([log]),
      }),
    };
  }

  return {
    nextState: transitionState(state, { slowQueries: Object.freeze([]), appendLog: log }),
    output: Object.freeze({
      success: true,
      issues: Object.freeze([]),
      suggestions: Object.freeze([]),
      indexSuggestions: Object.freeze([]),
      logs: Object.freeze([log]),
    }),
  };
}
