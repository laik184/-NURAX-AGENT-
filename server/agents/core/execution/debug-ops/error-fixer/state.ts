import type { ErrorReport, Patch } from "./types.js";

export type FixerStatus = "IDLE" | "ANALYZING" | "FIXING" | "SUCCESS" | "FAILED";

export interface ErrorFixerState {
  readonly errorId: string;
  readonly detectedErrors: readonly ErrorReport[];
  readonly rootCause: string;
  readonly fixApplied: boolean;
  readonly patches: readonly Patch[];
  readonly status: FixerStatus;
  readonly logs: readonly string[];
  readonly errors: readonly string[];
}

const DEFAULT_STATE: ErrorFixerState = Object.freeze({
  errorId: "",
  detectedErrors: Object.freeze([]),
  rootCause: "",
  fixApplied: false,
  patches: Object.freeze([]),
  status: "IDLE",
  logs: Object.freeze([]),
  errors: Object.freeze([]),
});

let _state: ErrorFixerState = DEFAULT_STATE;

export function getState(): Readonly<ErrorFixerState> {
  return _state;
}

export function resetState(): void {
  _state = DEFAULT_STATE;
}

export function transitionState(patch: Partial<ErrorFixerState>): Readonly<ErrorFixerState> {
  _state = Object.freeze({
    ..._state,
    ...patch,
    detectedErrors: patch.detectedErrors ? Object.freeze([...patch.detectedErrors]) : _state.detectedErrors,
    patches: patch.patches ? Object.freeze([...patch.patches]) : _state.patches,
    logs: patch.logs ? Object.freeze([...patch.logs]) : _state.logs,
    errors: patch.errors ? Object.freeze([...patch.errors]) : _state.errors,
  });

  return _state;
}
