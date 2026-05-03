import type { QueryOptimizerState, StatePatch } from "./types.js";

export const INITIAL_STATE: Readonly<QueryOptimizerState> = Object.freeze({
  queries: Object.freeze([]),
  slowQueries: Object.freeze([]),
  nPlusOneIssues: Object.freeze([]),
  indexSuggestions: Object.freeze([]),
  recommendations: Object.freeze([]),
  status: "IDLE",
  logs: Object.freeze([]),
  errors: Object.freeze([]),
});

export function transitionState(
  current: Readonly<QueryOptimizerState>,
  patch: StatePatch,
): Readonly<QueryOptimizerState> {
  const nextLogs = patch.appendLog
    ? Object.freeze([...current.logs, patch.appendLog])
    : current.logs;

  const nextErrors = patch.appendError
    ? Object.freeze([...current.errors, patch.appendError])
    : current.errors;

  return Object.freeze({
    queries:
      patch.queries !== undefined ? Object.freeze([...patch.queries]) : current.queries,
    slowQueries:
      patch.slowQueries !== undefined
        ? Object.freeze([...patch.slowQueries])
        : current.slowQueries,
    nPlusOneIssues:
      patch.nPlusOneIssues !== undefined
        ? Object.freeze([...patch.nPlusOneIssues])
        : current.nPlusOneIssues,
    indexSuggestions:
      patch.indexSuggestions !== undefined
        ? Object.freeze([...patch.indexSuggestions])
        : current.indexSuggestions,
    recommendations:
      patch.recommendations !== undefined
        ? Object.freeze([...patch.recommendations])
        : current.recommendations,
    status: patch.status ?? current.status,
    logs: nextLogs,
    errors: nextErrors,
  });
}
