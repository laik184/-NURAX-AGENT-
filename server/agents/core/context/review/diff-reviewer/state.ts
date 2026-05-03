import type {
  ClassifiedChange,
  DiffReviewState,
  ReviewDecision,
  RiskFinding,
} from "./types.js";

function freezeList<T>(items: readonly T[]): readonly T[] {
  return Object.freeze([...items]);
}

export function createInitialState(diffId: string): DiffReviewState {
  return Object.freeze({
    diffId,
    filesChanged: Object.freeze([]),
    changes: Object.freeze([]),
    risks: Object.freeze([]),
    decision: "APPROVE" as ReviewDecision,
    logs: Object.freeze([]),
    errors: Object.freeze([]),
  });
}

export function withFilesChanged(state: DiffReviewState, filesChanged: readonly string[]): DiffReviewState {
  return Object.freeze({
    ...state,
    filesChanged: freezeList(filesChanged),
  });
}

export function withChanges(state: DiffReviewState, changes: readonly ClassifiedChange[]): DiffReviewState {
  return Object.freeze({
    ...state,
    changes: freezeList(changes),
  });
}

export function withRisks(state: DiffReviewState, risks: readonly RiskFinding[]): DiffReviewState {
  return Object.freeze({
    ...state,
    risks: freezeList(risks),
  });
}

export function withDecision(state: DiffReviewState, decision: ReviewDecision): DiffReviewState {
  return Object.freeze({
    ...state,
    decision,
  });
}

export function appendLog(state: DiffReviewState, log: string): DiffReviewState {
  return Object.freeze({
    ...state,
    logs: freezeList([...state.logs, log]),
  });
}

export function appendError(state: DiffReviewState, error: string): DiffReviewState {
  return Object.freeze({
    ...state,
    errors: freezeList([...state.errors, error]),
  });
}
