import { RecoveryState, RetryRecord, RecoveryStatus } from "./types";

const MAX_HISTORY = 100;

let _state: RecoveryState = Object.freeze({
  attempts: 0,
  lastError: "",
  retryHistory: Object.freeze([]),
  status: "pending" as RecoveryStatus,
});

export function getState(): RecoveryState {
  return _state;
}

export function recordAttempt(record: RetryRecord): RecoveryState {
  const retryHistory = [..._state.retryHistory, Object.freeze(record)].slice(-MAX_HISTORY);
  _state = Object.freeze({
    ..._state,
    attempts: _state.attempts + 1,
    retryHistory: Object.freeze(retryHistory),
  });
  return _state;
}

export function setLastError(error: string): RecoveryState {
  _state = Object.freeze({ ..._state, lastError: error });
  return _state;
}

export function setStatus(status: RecoveryStatus): RecoveryState {
  _state = Object.freeze({ ..._state, status });
  return _state;
}

export function resetForSession(): RecoveryState {
  _state = Object.freeze({
    attempts: 0,
    lastError: "",
    retryHistory: Object.freeze([]),
    status: "pending" as RecoveryStatus,
  });
  return _state;
}

export function getTotalAttempts(): number {
  return _state.attempts;
}

export function getSuccessfulRecoveries(): number {
  return _state.retryHistory.filter((r) => r.outcome === "success").length;
}
