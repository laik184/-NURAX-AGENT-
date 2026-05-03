import type { MongooseSchemaState, StatePatch } from "./types.js";

export const INITIAL_STATE: Readonly<MongooseSchemaState> = Object.freeze({
  schemaName: "",
  fields: Object.freeze([]),
  relations: Object.freeze([]),
  indexes: Object.freeze([]),
  status: "IDLE",
  logs: Object.freeze([]),
  errors: Object.freeze([]),
});

export function transitionState(
  current: Readonly<MongooseSchemaState>,
  patch: StatePatch,
): Readonly<MongooseSchemaState> {
  const nextLogs = patch.appendLog
    ? Object.freeze([...current.logs, patch.appendLog])
    : current.logs;

  const nextErrors = patch.appendError
    ? Object.freeze([...current.errors, patch.appendError])
    : current.errors;

  return Object.freeze({
    schemaName: patch.schemaName ?? current.schemaName,
    fields: patch.fields !== undefined ? Object.freeze([...patch.fields]) : current.fields,
    relations: patch.relations !== undefined ? Object.freeze([...patch.relations]) : current.relations,
    indexes: patch.indexes !== undefined ? Object.freeze([...patch.indexes]) : current.indexes,
    status: patch.status ?? current.status,
    logs: nextLogs,
    errors: nextErrors,
  });
}
