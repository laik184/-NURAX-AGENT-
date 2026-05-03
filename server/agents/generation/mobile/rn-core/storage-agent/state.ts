import type { StorageAgentState, StorageTransitionPatch } from "./types.js";

export const INITIAL_STATE: Readonly<StorageAgentState> = Object.freeze({
  currentStorageMode: "ASYNC",
  lastOperation: null,
  errorState: null,
  accessLogs: Object.freeze([]),
  asyncStorage: Object.freeze({}),
  mmkvStorage: Object.freeze({}),
  secureStorage: Object.freeze({}),
  sqliteStorage: Object.freeze({}),
});

export function transitionStorageState(
  current: Readonly<StorageAgentState>,
  patch: StorageTransitionPatch,
): Readonly<StorageAgentState> {
  const nextLogs = patch.appendLog ? [...current.accessLogs, patch.appendLog] : [...current.accessLogs];

  return Object.freeze({
    currentStorageMode: patch.currentStorageMode ?? current.currentStorageMode,
    lastOperation: patch.lastOperation ?? current.lastOperation,
    errorState: patch.errorState === undefined ? current.errorState : patch.errorState,
    accessLogs: Object.freeze(nextLogs),
    asyncStorage: Object.freeze({ ...(patch.asyncStorage ?? current.asyncStorage) }),
    mmkvStorage: Object.freeze({ ...(patch.mmkvStorage ?? current.mmkvStorage) }),
    secureStorage: Object.freeze({ ...(patch.secureStorage ?? current.secureStorage) }),
    sqliteStorage: Object.freeze({ ...(patch.sqliteStorage ?? current.sqliteStorage) }),
  });
}
