import type { AgentExecutionResult, StorageAgentState, StorageInput, StorageOutput } from "../types.js";
import { transitionStorageState } from "../state.js";
import { deepFreeze } from "../utils/deep-freeze.util.js";
import { encryptValue, decryptValue } from "../utils/encryption.util.js";
import { normalizeStorageKey } from "../utils/key-normalizer.util.js";
import { safeStringify, safeParse } from "../utils/serialization.util.js";

function output(success: boolean, logs: readonly string[], data?: unknown, error?: string): Readonly<StorageOutput> {
  return deepFreeze({ success, data, logs: [...logs], error });
}

export function runSecureStorageAgent(
  state: Readonly<StorageAgentState>,
  input: StorageInput,
): Readonly<AgentExecutionResult> {
  const normalizedKey = input.key ? normalizeStorageKey(input.key) : "";

  if (input.operation === "GET") {
    const encrypted = normalizedKey ? state.secureStorage[normalizedKey] : undefined;
    const data = encrypted ? safeParse(decryptValue(encrypted)) : undefined;
    const next = transitionStorageState(state, {
      appendLog: `[SECURE][GET] key=${normalizedKey || "N/A"}`,
    });
    return deepFreeze({ nextState: next, output: output(true, next.accessLogs, data) });
  }

  if (input.operation === "SET") {
    const encrypted = encryptValue(safeStringify(input.value));
    const nextStore = deepFreeze({ ...state.secureStorage, [normalizedKey]: encrypted });
    const next = transitionStorageState(state, {
      secureStorage: nextStore,
      appendLog: `[SECURE][SET] key=${normalizedKey}`,
    });
    return deepFreeze({ nextState: next, output: output(true, next.accessLogs, input.value) });
  }

  if (input.operation === "REMOVE") {
    const { [normalizedKey]: _removed, ...remaining } = state.secureStorage;
    const next = transitionStorageState(state, {
      secureStorage: deepFreeze(remaining),
      appendLog: `[SECURE][REMOVE] key=${normalizedKey}`,
    });
    return deepFreeze({ nextState: next, output: output(true, next.accessLogs) });
  }

  if (input.operation === "CLEAR") {
    const next = transitionStorageState(state, {
      secureStorage: deepFreeze({}),
      appendLog: "[SECURE][CLEAR] cleared secure vault",
    });
    return deepFreeze({ nextState: next, output: output(true, next.accessLogs) });
  }

  const next = transitionStorageState(state, {
    errorState: `Unsupported Secure operation: ${input.operation}`,
    appendLog: `[SECURE][ERROR] unsupported=${input.operation}`,
  });

  return deepFreeze({
    nextState: next,
    output: output(false, next.accessLogs, undefined, next.errorState ?? "Unknown error"),
  });
}
