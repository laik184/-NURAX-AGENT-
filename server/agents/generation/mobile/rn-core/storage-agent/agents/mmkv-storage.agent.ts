import type { AgentExecutionResult, StorageAgentState, StorageInput, StorageOutput } from "../types.js";
import { transitionStorageState } from "../state.js";
import { deepFreeze } from "../utils/deep-freeze.util.js";
import { normalizeStorageKey } from "../utils/key-normalizer.util.js";

function output(success: boolean, logs: readonly string[], data?: unknown, error?: string): Readonly<StorageOutput> {
  return deepFreeze({ success, data, logs: [...logs], error });
}

export function runMmkvStorageAgent(
  state: Readonly<StorageAgentState>,
  input: StorageInput,
): Readonly<AgentExecutionResult> {
  const normalizedKey = input.key ? normalizeStorageKey(input.key) : "";

  if (input.operation === "GET") {
    const data = state.mmkvStorage[normalizedKey];
    const next = transitionStorageState(state, {
      appendLog: `[MMKV][GET][CACHE_HIT=${data !== undefined}] key=${normalizedKey || "N/A"}`,
    });
    return deepFreeze({ nextState: next, output: output(true, next.accessLogs, data) });
  }

  if (input.operation === "SET") {
    const nextStore = deepFreeze({ ...state.mmkvStorage, [normalizedKey]: input.value });
    const next = transitionStorageState(state, {
      mmkvStorage: nextStore,
      appendLog: `[MMKV][SET][CACHE_WRITE] key=${normalizedKey}`,
    });
    return deepFreeze({ nextState: next, output: output(true, next.accessLogs, input.value) });
  }

  if (input.operation === "REMOVE") {
    const { [normalizedKey]: _removed, ...remaining } = state.mmkvStorage;
    const next = transitionStorageState(state, {
      mmkvStorage: deepFreeze(remaining),
      appendLog: `[MMKV][REMOVE] key=${normalizedKey}`,
    });
    return deepFreeze({ nextState: next, output: output(true, next.accessLogs) });
  }

  if (input.operation === "CLEAR") {
    const next = transitionStorageState(state, {
      mmkvStorage: deepFreeze({}),
      appendLog: "[MMKV][CLEAR] cleared cache",
    });
    return deepFreeze({ nextState: next, output: output(true, next.accessLogs) });
  }

  const next = transitionStorageState(state, {
    errorState: `Unsupported MMKV operation: ${input.operation}`,
    appendLog: `[MMKV][ERROR] unsupported=${input.operation}`,
  });
  return deepFreeze({
    nextState: next,
    output: output(false, next.accessLogs, undefined, next.errorState ?? "Unknown error"),
  });
}
