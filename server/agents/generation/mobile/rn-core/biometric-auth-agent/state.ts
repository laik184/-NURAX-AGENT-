import type { AuthState } from './types';

export const DEFAULT_AUTH_STATE: Readonly<AuthState> = Object.freeze({
  authStatus: 'idle',
  attempts: 0,
  locked: false,
  sessionExpiry: null,
});
