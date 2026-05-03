import path from 'node:path';
import { applyDefaultValues } from './agents/default-provider.agent.js';
import { generateEnvFile } from './agents/env-generator.agent.js';
import { loadExistingEnv } from './agents/env-loader.agent.js';
import { syncEnvValues } from './agents/env-sync.agent.js';
import { validateEnv } from './agents/env-validator.agent.js';
import { buildEnvSchema } from './agents/schema-builder.agent.js';
import { createInitialEnvState } from './state.js';
import type { EnvironmentName, EnvGenerationResult, EnvOrchestratorInput, EnvRuntimeState } from './types.js';
import { formatLogEntry } from './utils/logger.util.js';

const envFileByEnvironment: Record<EnvironmentName, string> = {
  dev: '.env.dev',
  test: '.env.test',
  prod: '.env.prod',
};

const withState = (current: Readonly<EnvRuntimeState>, patch: Partial<EnvRuntimeState>): Readonly<EnvRuntimeState> =>
  Object.freeze({
    ...current,
    ...patch,
  });

export const setupEnv = async (input: EnvOrchestratorInput = {}): Promise<Readonly<EnvGenerationResult>> => {
  const environment: EnvironmentName = input.environment ?? 'dev';
  const cwd = input.cwd ?? process.cwd();
  const envPath = path.join(cwd, envFileByEnvironment[environment]);

  let state = createInitialEnvState();
  state = withState(state, {
    status: 'RUNNING',
    logs: [...state.logs, formatLogEntry('orchestrator', `Setup started for ${environment}`)],
  });

  try {
    const schema = buildEnvSchema(environment);
    state = withState(state, {
      schema,
      logs: [...state.logs, formatLogEntry('schema-builder', `Loaded ${schema.variables.length} variables`)],
    });

    const loaded = await loadExistingEnv(envPath);
    state = withState(state, {
      env: loaded,
      logs: [...state.logs, formatLogEntry('env-loader', `Loaded ${Object.keys(loaded).length} existing variables`)],
    });

    const defaultsApplied = applyDefaultValues(state.env, schema);
    state = withState(state, {
      env: defaultsApplied,
      logs: [...state.logs, formatLogEntry('default-provider', 'Applied default values')],
    });

    const validation = validateEnv(defaultsApplied, schema);
    state = withState(state, {
      missing: validation.missing,
      invalid: validation.invalid,
      errors: validation.errors,
      logs: [...state.logs, formatLogEntry('env-validator', validation.valid ? 'Validation passed' : 'Validation failed')],
    });

    if (!validation.valid) {
      const failed: EnvGenerationResult = {
        success: false,
        created: false,
        updated: false,
        missing: state.missing,
        invalid: state.invalid,
        logs: state.logs,
        error: state.errors.join('; '),
      };
      state = withState(state, { status: 'FAILED' });
      return Object.freeze(failed);
    }

    const synced = syncEnvValues(loaded, defaultsApplied, schema);
    const generated = await generateEnvFile(envPath, synced.synced);
    state = withState(state, {
      env: synced.synced,
      status: 'SUCCESS',
      logs: [...state.logs, formatLogEntry('env-generator', `Wrote environment file: ${envPath}`)],
    });

    const output: EnvGenerationResult = {
      success: true,
      created: generated.created,
      updated: generated.updated || synced.updated,
      missing: state.missing,
      invalid: state.invalid,
      logs: state.logs,
    };

    return Object.freeze(output);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown environment configuration error';
    state = withState(state, {
      status: 'FAILED',
      errors: [...state.errors, message],
      logs: [...state.logs, formatLogEntry('orchestrator', `Setup failed: ${message}`)],
    });

    const failed: EnvGenerationResult = {
      success: false,
      created: false,
      updated: false,
      missing: state.missing,
      invalid: state.invalid,
      logs: state.logs,
      error: message,
    };

    return Object.freeze(failed);
  }
};

export const validateConfiguredEnv = async (
  input: EnvOrchestratorInput = {},
): Promise<Readonly<EnvGenerationResult>> => {
  const environment: EnvironmentName = input.environment ?? 'dev';
  const cwd = input.cwd ?? process.cwd();
  const envPath = path.join(cwd, envFileByEnvironment[environment]);

  const schema = buildEnvSchema(environment);
  const loaded = await loadExistingEnv(envPath);
  const validation = validateEnv(loaded, schema);

  const output: EnvGenerationResult = {
    success: validation.valid,
    created: false,
    updated: false,
    missing: validation.missing,
    invalid: validation.invalid,
    logs: [formatLogEntry('env-validator', validation.valid ? 'Validation passed' : 'Validation failed')],
    error: validation.valid ? undefined : validation.errors.join('; '),
  };

  return Object.freeze(output);
};

export const syncEnv = async (input: EnvOrchestratorInput = {}): Promise<Readonly<EnvGenerationResult>> => {
  const environment: EnvironmentName = input.environment ?? 'dev';
  const cwd = input.cwd ?? process.cwd();
  const envPath = path.join(cwd, envFileByEnvironment[environment]);

  const schema = buildEnvSchema(environment);
  const existing = await loadExistingEnv(envPath);
  const withDefaults = applyDefaultValues(existing, schema);
  const validation = validateEnv(withDefaults, schema);

  if (!validation.valid) {
    const failed: EnvGenerationResult = {
      success: false,
      created: false,
      updated: false,
      missing: validation.missing,
      invalid: validation.invalid,
      logs: [formatLogEntry('env-sync', 'Sync aborted due to validation errors')],
      error: validation.errors.join('; '),
    };

    return Object.freeze(failed);
  }

  const synced = syncEnvValues(existing, withDefaults, schema);
  const generated = await generateEnvFile(envPath, synced.synced);

  const output: EnvGenerationResult = {
    success: true,
    created: generated.created,
    updated: generated.updated || synced.updated,
    missing: [],
    invalid: [],
    logs: [formatLogEntry('env-sync', `Synced variables for ${environment}`)],
  };

  return Object.freeze(output);
};
