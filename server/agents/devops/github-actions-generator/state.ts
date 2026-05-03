import type { GithubActionsState, StatePatch } from "./types.js";

export const INITIAL_STATE: Readonly<GithubActionsState> = Object.freeze({
  workflowName: "",
  jobs: Object.freeze([]),
  steps: Object.freeze([]),
  triggers: Object.freeze([]),
  status: "IDLE",
  logs: Object.freeze([]),
  errors: Object.freeze([]),
});

export function transitionState(
  current: Readonly<GithubActionsState>,
  patch: StatePatch,
): Readonly<GithubActionsState> {
  const nextLogs = patch.appendLog
    ? Object.freeze([...current.logs, patch.appendLog])
    : current.logs;

  const nextErrors = patch.appendError
    ? Object.freeze([...current.errors, patch.appendError])
    : current.errors;

  return Object.freeze({
    workflowName: patch.workflowName !== undefined ? patch.workflowName : current.workflowName,
    jobs: patch.jobs !== undefined ? Object.freeze([...patch.jobs]) : current.jobs,
    steps: patch.steps !== undefined ? Object.freeze([...patch.steps]) : current.steps,
    triggers:
      patch.triggers !== undefined ? Object.freeze([...patch.triggers]) : current.triggers,
    status: patch.status ?? current.status,
    logs: nextLogs,
    errors: nextErrors,
  });
}
