import type { EnvSchema } from '../types.js';

export const applyDefaultValues = (
  env: Record<string, string>,
  schema: EnvSchema,
): Record<string, string> => {
  const merged: Record<string, string> = { ...env };

  for (const variable of schema.variables) {
    if (merged[variable.key] === undefined && variable.defaultValue !== undefined) {
      merged[variable.key] = variable.defaultValue;
    }
  }

  return merged;
};
