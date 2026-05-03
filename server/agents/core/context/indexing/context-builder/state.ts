import type { BuildContextState, BuilderStatus, RankedContext } from "./types.js";

function freezeState(state: BuildContextState): Readonly<BuildContextState> {
  return Object.freeze({
    ...state,
    selectedFiles: Object.freeze([...state.selectedFiles]),
    rankedContext: Object.freeze([...state.rankedContext]),
    logs: Object.freeze([...state.logs]),
    errors: Object.freeze([...state.errors]),
  });
}

export function createInitialState(query: string): Readonly<BuildContextState> {
  return freezeState({
    query,
    selectedFiles: Object.freeze([]),
    rankedContext: Object.freeze([]),
    tokenUsage: 0,
    status: "IDLE",
    logs: Object.freeze([]),
    errors: Object.freeze([]),
  });
}

export interface StateTransition {
  readonly status?: BuilderStatus;
  readonly selectedFiles?: readonly string[];
  readonly rankedContext?: readonly RankedContext[];
  readonly tokenUsage?: number;
  readonly log?: string;
  readonly error?: string;
}

export function transitionState(
  current: Readonly<BuildContextState>,
  transition: Readonly<StateTransition>,
): Readonly<BuildContextState> {
  return freezeState({
    ...current,
    status: transition.status ?? current.status,
    selectedFiles: transition.selectedFiles ?? current.selectedFiles,
    rankedContext: transition.rankedContext ?? current.rankedContext,
    tokenUsage: transition.tokenUsage ?? current.tokenUsage,
    logs: transition.log ? [...current.logs, transition.log] : current.logs,
    errors: transition.error ? [...current.errors, transition.error] : current.errors,
  });
}
