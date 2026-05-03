import type { MigrationFile, Schema, SchemaChange } from "./types.js";

export type GenerationStatus = "IDLE" | "GENERATING" | "SUCCESS" | "FAILED";

export interface MigrationGeneratorState {
  readonly currentSchema: Schema;
  readonly targetSchema: Schema;
  readonly changes: readonly SchemaChange[];
  readonly generatedFiles: readonly MigrationFile[];
  readonly status: GenerationStatus;
  readonly logs: readonly string[];
  readonly errors: readonly string[];
}

const EMPTY_SCHEMA: Schema = Object.freeze({ tables: Object.freeze({}) });

export function createInitialState(): MigrationGeneratorState {
  return Object.freeze({
    currentSchema: EMPTY_SCHEMA,
    targetSchema: EMPTY_SCHEMA,
    changes: Object.freeze([]),
    generatedFiles: Object.freeze([]),
    status: "IDLE",
    logs: Object.freeze([]),
    errors: Object.freeze([]),
  });
}

export function beginGeneration(
  state: MigrationGeneratorState,
  currentSchema: Schema,
  targetSchema: Schema,
): MigrationGeneratorState {
  return Object.freeze({
    ...state,
    currentSchema,
    targetSchema,
    status: "GENERATING",
    changes: Object.freeze([]),
    generatedFiles: Object.freeze([]),
    errors: Object.freeze([]),
  });
}

export function setDetectedChanges(
  state: MigrationGeneratorState,
  changes: readonly SchemaChange[],
): MigrationGeneratorState {
  return Object.freeze({
    ...state,
    changes: Object.freeze([...changes]),
  });
}

export function addGeneratedFile(
  state: MigrationGeneratorState,
  file: MigrationFile,
): MigrationGeneratorState {
  return Object.freeze({
    ...state,
    generatedFiles: Object.freeze([...state.generatedFiles, file]),
  });
}

export function appendLog(
  state: MigrationGeneratorState,
  message: string,
): MigrationGeneratorState {
  return Object.freeze({
    ...state,
    logs: Object.freeze([...state.logs, message]),
  });
}

export function markSuccess(state: MigrationGeneratorState): MigrationGeneratorState {
  return Object.freeze({
    ...state,
    status: "SUCCESS",
  });
}

export function markFailed(
  state: MigrationGeneratorState,
  error: string,
): MigrationGeneratorState {
  return Object.freeze({
    ...state,
    status: "FAILED",
    errors: Object.freeze([...state.errors, error]),
  });
}
