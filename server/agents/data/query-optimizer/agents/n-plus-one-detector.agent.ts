import { transitionState } from "../state.js";
import type { AgentResult, OptimizationIssue, Query, QueryOptimizerState } from "../types.js";
import { buildError, buildLog } from "../utils/logger.util.js";
import { groupSimilarQueries, getNPlusOneThreshold } from "../utils/pattern-matcher.util.js";
import { extractTables } from "../utils/sql-normalizer.util.js";

const SOURCE = "n-plus-one-detector";

export interface NPlusOneDetectorInput {
  readonly queries: readonly Query[];
  readonly state: Readonly<QueryOptimizerState>;
}

export function detectNPlusOne(input: NPlusOneDetectorInput): Readonly<AgentResult> {
  const { queries, state } = input;

  if (queries.length < getNPlusOneThreshold()) {
    const log = buildLog(SOURCE, `Not enough queries to assess N+1 (need >=${getNPlusOneThreshold()}, got ${queries.length})`);
    return {
      nextState: transitionState(state, { appendLog: log }),
      output: Object.freeze({ success: true, issues: [], suggestions: [], indexSuggestions: [], logs: [log] }),
    };
  }

  const groups = groupSimilarQueries(queries);

  const issues: OptimizationIssue[] = groups.map((group) => {
    const tables = extractTables(group.pattern);
    const affectedTable = tables[0];
    return Object.freeze({
      queryId: group.queries[0]!.id,
      type: "N_PLUS_ONE" as const,
      severity: group.count >= 10 ? ("CRITICAL" as const) : ("HIGH" as const),
      description: `N+1 pattern detected: same query executed ${group.count} times. Consider batching or eager loading.`,
      affectedTable,
    });
  });

  const log = buildLog(SOURCE, `Detected ${groups.length} N+1 pattern(s) from ${queries.length} queries`);

  if (issues.length > 0) {
    const errorLog = buildError(SOURCE, `${issues.length} N+1 pattern(s) found`);
    return {
      nextState: transitionState(state, {
        nPlusOneIssues: Object.freeze(issues),
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
    nextState: transitionState(state, { nPlusOneIssues: Object.freeze([]), appendLog: log }),
    output: Object.freeze({
      success: true,
      issues: Object.freeze([]),
      suggestions: Object.freeze([]),
      indexSuggestions: Object.freeze([]),
      logs: Object.freeze([log]),
    }),
  };
}
