import type { EnvironmentName, EnvSchema } from '../types.js';
import { normalizeSchema } from '../utils/schema-normalizer.util.js';

const baseVariables = [
  { key: 'NODE_ENV', required: true, allowedValues: ['development', 'test', 'production'] as const },
  { key: 'PORT', required: true, defaultValue: '3000', pattern: /^\d+$/ },
  { key: 'DATABASE_URL', required: true, defaultValue: 'postgres://localhost:5432/app' },
  { key: 'LOG_LEVEL', required: true, defaultValue: 'info', allowedValues: ['debug', 'info', 'warn', 'error'] as const },
  { key: 'JWT_SECRET', required: true, defaultValue: 'change-me', sensitive: true },
] as const;

const environmentDefaults: Record<EnvironmentName, string> = {
  dev: 'development',
  test: 'test',
  prod: 'production',
};

export const buildEnvSchema = (environment: EnvironmentName): EnvSchema => {
  const schema: EnvSchema = {
    environment,
    variables: baseVariables.map((v) => {
      if (v.key === 'NODE_ENV') {
        return {
          ...v,
          defaultValue: environmentDefaults[environment],
        };
      }

      return { ...v };
    }),
  };

  return normalizeSchema(schema);
};
