import type { AgentExecutionResult, StorageAgentState, StorageInput, StorageOutput } from "../types.js";
import { transitionStorageState } from "../state.js";
import { deepFreeze } from "../utils/deep-freeze.util.js";
import { normalizeStorageKey } from "../utils/key-normalizer.util.js";

function output(success: boolean, logs: readonly string[], data?: unknown, error?: string): Readonly<StorageOutput> {
  return deepFreeze({ success, data, logs: [...logs], error });
}

export function runAsyncStorageAgent(
  state: Readonly<StorageAgentState>,
  input: StorageInput,
): Readonly<AgentExecutionResult> {
  const normalizedKey = input.key ? normalizeStorageKey(input.key) : "";

  if (input.operation === "GET") {
    const data = normalizedKey ? state.asyncStorage[normalizedKey] : undefined;
    const next = transitionStorageState(state, {
      appendLog: `[ASYNC][GET] key=${normalizedKey || "N/A"}`,
    });
    return deepFreeze({ nextState: next, output: output(true, next.accessLogs, data) });
  }

  if (input.operation === "SET") {
    const nextStore = deepFreeze({ ...state.asyncStorage, [normalizedKey]: input.value });
    const next = transitionStorageState(state, {
      asyncStorage: nextStore,
      appendLog: `[ASYNC][SET] key=${normalizedKey}`,
    });
    return deepFreeze({ nextState: next, output: output(true, next.accessLogs, input.value) });
  }

  if (input.operation === "REMOVE") {
    const { [normalizedKey]: _removed, ...remaining } = state.asyncStorage;
    const next = transitionStorageState(state, {
      asyncStorage: deepFreeze(remaining),
      appendLog: `[ASYNC][REMOVE] key=${normalizedKey}`,
    });
    return deepFreeze({ nextState: next, output: output(true, next.accessLogs) });
  }

  if (input.operation === "CLEAR") {
    const next = transitionStorageState(state, {
      asyncStorage: deepFreeze({}),
      appendLog: "[ASYNC][CLEAR] cleared all keys",
    });
    return deepFreeze({ nextState: next, output: output(true, next.accessLogs) });
  }

  const next = transitionStorageState(state, {
    errorState: `Unsupported async operation: ${input.operation}`,
    appendLog: `[ASYNC][ERROR] unsupported=${input.operation}`,
  });
  return deepFreeze({
    nextState: next,
    output: output(false, next.accessLogs, undefined, next.errorState ?? "Unknown error"),
  });
}
