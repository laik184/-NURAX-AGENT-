import type { EnvSchema, EnvValidationResult } from '../types.js';

export const validateEnv = (env: Record<string, string>, schema: EnvSchema): EnvValidationResult => {
  const missing: string[] = [];
  const invalid: string[] = [];
  const errors: string[] = [];

  for (const variable of schema.variables) {
    const rawValue = env[variable.key];
    const value = rawValue?.trim();

    if (variable.required && !value) {
      missing.push(variable.key);
      errors.push(`${variable.key} is required`);
      continue;
    }

    if (!value) {
      continue;
    }

    if (variable.pattern && !variable.pattern.test(value)) {
      invalid.push(variable.key);
      errors.push(`${variable.key} failed pattern validation`);
    }

    if (variable.allowedValues && !variable.allowedValues.includes(value)) {
      invalid.push(variable.key);
      errors.push(`${variable.key} must be one of: ${variable.allowedValues.join(', ')}`);
    }
  }

  return {
    valid: missing.length === 0 && invalid.length === 0,
    missing,
    invalid,
    errors,
  };
};
