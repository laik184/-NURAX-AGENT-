import type { EnvSchema } from '../types.js';

export const normalizeSchema = (schema: EnvSchema): EnvSchema => {
  const deduped = new Map<string, (typeof schema.variables)[number]>();

  for (const variable of schema.variables) {
    deduped.set(variable.key, variable);
  }

  return {
    environment: schema.environment,
    variables: Object.freeze(Array.from(deduped.values())),
  };
};
