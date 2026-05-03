import type { SchemaGeneratorState, StatePatch } from "./types.js";

export const INITIAL_STATE: Readonly<SchemaGeneratorState> = Object.freeze({
  models: Object.freeze([]),
  relations: Object.freeze([]),
  enums: Object.freeze([]),
  datasource: Object.freeze({}),
  generator: Object.freeze({}),
  status: "IDLE",
  logs: Object.freeze([]),
  errors: Object.freeze([]),
});

export function transitionState(
  current: Readonly<SchemaGeneratorState>,
  patch: StatePatch,
): Readonly<SchemaGeneratorState> {
  const nextLogs = patch.appendLog
    ? Object.freeze([...current.logs, patch.appendLog])
    : current.logs;

  const nextErrors = patch.appendError
    ? Object.freeze([...current.errors, patch.appendError])
    : current.errors;

  return Object.freeze({
    models: patch.models !== undefined ? Object.freeze([...patch.models]) : current.models,
    relations: patch.relations !== undefined ? Object.freeze([...patch.relations]) : current.relations,
    enums: patch.enums !== undefined ? Object.freeze([...patch.enums]) : current.enums,
    datasource: patch.datasource !== undefined ? Object.freeze({ ...patch.datasource }) : current.datasource,
    generator: patch.generator !== undefined ? Object.freeze({ ...patch.generator }) : current.generator,
    status: patch.status ?? current.status,
    logs: nextLogs,
    errors: nextErrors,
  });
}
