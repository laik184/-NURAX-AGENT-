import type { FileOperationLog, FileWriterState } from "./types.js";

const INITIAL_STATE: FileWriterState = Object.freeze({
  operations: Object.freeze([]),
  lastOperation: null,
  logs: Object.freeze([]),
  errors: Object.freeze([])
});

let writerState: FileWriterState = INITIAL_STATE;

const freezeLogs = (items: readonly string[]): readonly string[] => Object.freeze([...items]);
const freezeOperations = (items: readonly FileOperationLog[]): readonly FileOperationLog[] =>
  Object.freeze([...items]);

export const getFileWriterState = (): FileWriterState => writerState;

export const recordFileWriterState = (entry: {
  readonly operation: FileOperationLog;
  readonly log: string;
  readonly error?: string;
}): FileWriterState => {
  const nextOperations = freezeOperations([...writerState.operations, entry.operation]);
  const nextLogs = freezeLogs([...writerState.logs, entry.log]);
  const nextErrors = entry.error
    ? freezeLogs([...writerState.errors, entry.error])
    : writerState.errors;

  writerState = Object.freeze({
    operations: nextOperations,
    lastOperation: Object.freeze({
      action: entry.operation.action,
      path: entry.operation.path,
      status: entry.operation.status
    }),
    logs: nextLogs,
    errors: nextErrors
  });

  return writerState;
};

export const resetFileWriterState = (): FileWriterState => {
  writerState = INITIAL_STATE;
  return writerState;
};
