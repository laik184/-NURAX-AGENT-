import type { Decision, Conflict, EvaluationScore } from "./types";

export interface GovernorSession {
  readonly sessionId: string;
  readonly decisions: readonly Decision[];
  readonly selectedDecision: Decision | null;
  readonly conflicts: readonly Conflict[];
  readonly scores: readonly EvaluationScore[];
  readonly logs: readonly string[];
  readonly resolvedAt: number | null;
}

export interface GlobalGovernorState {
  readonly sessions: readonly GovernorSession[];
  readonly totalResolved: number;
  readonly totalBlocked: number;
  readonly conflictsDetected: number;
}

let state: GlobalGovernorState = Object.freeze({
  sessions: Object.freeze([]),
  totalResolved: 0,
  totalBlocked: 0,
  conflictsDetected: 0,
});

export function getState(): GlobalGovernorState {
  return state;
}

export function recordSession(session: Omit<GovernorSession, never>): void {
  const frozen = Object.freeze({
    ...session,
    decisions: Object.freeze([...session.decisions]),
    conflicts: Object.freeze([...session.conflicts]),
    scores: Object.freeze([...session.scores]),
    logs: Object.freeze([...session.logs]),
  });

  const sessions = [...state.sessions, frozen].slice(-100);

  state = Object.freeze({
    sessions: Object.freeze(sessions),
    totalResolved: state.totalResolved + (session.selectedDecision ? 1 : 0),
    totalBlocked: state.totalBlocked,
    conflictsDetected: state.conflictsDetected + session.conflicts.length,
  });
}

export function incrementBlocked(count: number): void {
  state = Object.freeze({
    ...state,
    totalBlocked: state.totalBlocked + count,
  });
}

export function resetState(): void {
  state = Object.freeze({
    sessions: Object.freeze([]),
    totalResolved: 0,
    totalBlocked: 0,
    conflictsDetected: 0,
  });
}
