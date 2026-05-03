import type { EnvRuntimeState } from './types.js';

export const createInitialEnvState = (): Readonly<EnvRuntimeState> =>
  Object.freeze({
    env: {},
    schema: null,
    missing: [],
    invalid: [],
    status: 'IDLE',
    logs: [],
    errors: [],
  });
