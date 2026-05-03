import type { AgentResult, AuthState } from '../types';

interface ThreatDetectorData {
  state: Readonly<AuthState>;
  lockUntil?: number;
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000;

export const threatDetectorAgent = async (
  currentState: Readonly<AuthState>,
  wasAttemptSuccessful: boolean,
  nowMs: number,
): Promise<AgentResult<ThreatDetectorData>> => {
  const logs: string[] = ['Evaluating authentication threat signals.'];

  if (wasAttemptSuccessful) {
    logs.push('Successful authentication resets threat counters.');
    return {
      success: true,
      logs,
      data: {
        state: Object.freeze<AuthState>({
          authStatus: 'authenticated',
          attempts: 0,
          locked: false,
          sessionExpiry: currentState.sessionExpiry,
        }),
      },
    };
  }

  const nextAttempts = currentState.attempts + 1;
  const shouldLock = nextAttempts >= MAX_ATTEMPTS;
  const lockUntil = shouldLock ? nowMs + LOCKOUT_MS : undefined;

  const state = Object.freeze<AuthState>({
    authStatus: shouldLock ? 'locked' : 'failed',
    attempts: nextAttempts,
    locked: shouldLock,
    sessionExpiry: lockUntil ?? currentState.sessionExpiry,
  });

  logs.push(
    shouldLock
      ? `Threat threshold exceeded. Locking authentication until ${lockUntil}.`
      : `Auth failure count increased to ${nextAttempts}.`,
  );

  return {
    success: !shouldLock,
    logs,
    error: shouldLock ? 'biometric_locked' : undefined,
    data: {
      state,
      lockUntil,
    },
  };
};
