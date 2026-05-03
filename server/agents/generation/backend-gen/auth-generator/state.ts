import type { AuthStatus, AuthStrategy } from './types.js';

export interface AuthGeneratorState {
  strategy: AuthStrategy;
  roles: string[];
  permissions: string[];
  generatedFiles: string[];
  status: AuthStatus;
  logs: string[];
  errors: string[];
}

const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value as Record<string, unknown>).forEach((entry) => {
      if (entry && typeof entry === 'object') {
        deepFreeze(entry);
      }
    });
  }
  return value;
};

export const createInitialState = (): Readonly<AuthGeneratorState> =>
  deepFreeze({
    strategy: 'JWT',
    roles: [],
    permissions: [],
    generatedFiles: [],
    status: 'IDLE',
    logs: [],
    errors: [],
  });

interface TransitionInput {
  strategy?: AuthStrategy;
  roles?: string[];
  permissions?: string[];
  generatedFiles?: string[];
  status?: AuthStatus;
  log?: string;
  error?: string;
}

export const transitionState = (
  current: Readonly<AuthGeneratorState>,
  input: TransitionInput,
): Readonly<AuthGeneratorState> => {
  const next: AuthGeneratorState = {
    strategy: input.strategy ?? current.strategy,
    roles: input.roles ?? current.roles,
    permissions: input.permissions ?? current.permissions,
    generatedFiles: input.generatedFiles ?? current.generatedFiles,
    status: input.status ?? current.status,
    logs: input.log ? [...current.logs, input.log] : [...current.logs],
    errors: input.error ? [...current.errors, input.error] : [...current.errors],
  };

  return deepFreeze(next);
};
