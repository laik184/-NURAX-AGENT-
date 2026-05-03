import type { EnvConfig } from '../types.js';

export const injectEnvironmentVariables = (env: Readonly<Record<string, string>> = {}): EnvConfig => ({
  variables: Object.freeze({ ...env }),
});
