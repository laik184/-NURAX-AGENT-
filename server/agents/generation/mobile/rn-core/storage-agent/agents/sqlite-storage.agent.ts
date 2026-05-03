import type { AgentExecutionResult, StorageAgentState, StorageInput, StorageOutput } from "../types.js";
import { transitionStorageState } from "../state.js";
import { deepFreeze } from "../utils/deep-freeze.util.js";
import { normalizeTableName } from "../utils/key-normalizer.util.js";

function output(success: boolean, logs: readonly string[], data?: unknown, error?: string): Readonly<StorageOutput> {
  return deepFreeze({ success, data, logs: [...logs], error });
}

function recordMatches(
  record: Readonly<Record<string, unknown>>,
  where?: Readonly<Record<string, unknown>>,
): boolean {
  if (!where) {
    return true;
  }

  return Object.entries(where).every(([key, expected]) => record[key] === expected);
}

export function runSqliteStorageAgent(
  state: Readonly<StorageAgentState>,
  input: StorageInput,
): Readonly<AgentExecutionResult> {
  const tableName = normalizeTableName(input.table ?? "default_table");
  const currentTable = state.sqliteStorage[tableName] ?? Object.freeze([]);

  if (input.operation === "CREATE_TABLE") {
    const nextSqlite = deepFreeze({ ...state.sqliteStorage, [tableName]: currentTable });
    const next = transitionStorageState(state, {
      sqliteStorage: nextSqlite,
      appendLog: `[SQLITE][CREATE_TABLE] table=${tableName}`,
    });
    return deepFreeze({ nextState: next, output: output(true, next.accessLogs, { table: tableName }) });
  }

  if (input.operation === "READ_TABLE") {
    const records = currentTable.filter((item) => recordMatches(item, input.where));
    const next = transitionStorageState(state, {
      appendLog: `[SQLITE][READ_TABLE] table=${tableName} rows=${records.length}`,
    });
    return deepFreeze({ nextState: next, output: output(true, next.accessLogs, records) });
  }

  if (input.operation === "WRITE_TABLE") {
    const record = deepFreeze({ ...(input.record ?? {}) });
    const nextTable = deepFreeze([...currentTable, record]);
    const nextSqlite = deepFreeze({ ...state.sqliteStorage, [tableName]: nextTable });
    const next = transitionStorageState(state, {
      sqliteStorage: nextSqlite,
      appendLog: `[SQLITE][WRITE_TABLE] table=${tableName} rows=${nextTable.length}`,
    });
    return deepFreeze({ nextState: next, output: output(true, next.accessLogs, record) });
  }

  if (input.operation === "DELETE_TABLE") {
    const { [tableName]: _deleted, ...remaining } = state.sqliteStorage;
    const next = transitionStorageState(state, {
      sqliteStorage: deepFreeze(remaining),
      appendLog: `[SQLITE][DELETE_TABLE] table=${tableName}`,
    });
    return deepFreeze({ nextState: next, output: output(true, next.accessLogs) });
  }

  const next = transitionStorageState(state, {
    errorState: `Unsupported SQLite operation: ${input.operation}`,
    appendLog: `[SQLITE][ERROR] unsupported=${input.operation}`,
  });

  return deepFreeze({
    nextState: next,
    output: output(false, next.accessLogs, undefined, next.errorState ?? "Unknown error"),
  });
}
