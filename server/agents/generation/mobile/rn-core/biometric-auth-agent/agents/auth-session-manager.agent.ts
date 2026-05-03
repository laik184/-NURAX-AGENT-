import type { AgentResult, AuthRequest, AuthState } from '../types';
import { mapNativeError } from '../utils/error-mapper.util';

interface SessionManagerData {
  state: Readonly<AuthState>;
  refreshIssued: boolean;
}

const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000;

export const authSessionManagerAgent = async (
  request: AuthRequest,
  currentState: Readonly<AuthState>,
): Promise<AgentResult<SessionManagerData>> => {
  const logs: string[] = ['Evaluating authentication session state.'];
  const now = request.timestampMs ?? Date.now();

  if (currentState.locked && currentState.sessionExpiry && currentState.sessionExpiry > now) {
    logs.push('Session is currently locked.');
    return { success: false, logs, error: mapNativeError('SESSION_EXPIRED') };
  }

  const timeoutMs = request.sessionTimeoutMs ?? DEFAULT_TIMEOUT_MS;
  const nextExpiry = now + timeoutMs;

  const shouldRefresh = Boolean(request.refreshToken && currentState.sessionExpiry && currentState.sessionExpiry <= now);

  const nextState = Object.freeze<AuthState>({
    authStatus: 'authenticated',
    attempts: 0,
    locked: false,
    sessionExpiry: nextExpiry,
  });

  logs.push(shouldRefresh ? 'Session refreshed using refresh token.' : 'Session extended successfully.');

  return {
    success: true,
    logs,
    data: {
      state: nextState,
      refreshIssued: shouldRefresh,
    },
  };
};
