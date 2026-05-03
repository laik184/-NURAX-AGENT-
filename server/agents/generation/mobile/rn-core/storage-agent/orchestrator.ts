import { runAsyncStorageAgent } from "./agents/async-storage.agent.js";
import { runMmkvStorageAgent } from "./agents/mmkv-storage.agent.js";
import { runSecureStorageAgent } from "./agents/secure-storage.agent.js";
import { selectStorageMode } from "./agents/storage-selector.agent.js";
import { runSqliteStorageAgent } from "./agents/sqlite-storage.agent.js";
import { INITIAL_STATE, transitionStorageState } from "./state.js";
import type { AgentExecutionResult, StorageAgentState, StorageInput, StorageMode } from "./types.js";
import { deepFreeze } from "./utils/deep-freeze.util.js";

function runSelectedAgent(
  mode: StorageMode,
  state: Readonly<StorageAgentState>,
  input: StorageInput,
): Readonly<AgentExecutionResult> {
  if (mode === "SECURE") {
    return runSecureStorageAgent(state, input);
  }

  if (mode === "SQLITE") {
    return runSqliteStorageAgent(state, input);
  }

  if (mode === "MMKV") {
    return runMmkvStorageAgent(state, input);
  }

  return runAsyncStorageAgent(state, input);
}

export function runStorageOrchestrator(
  input: StorageInput,
  currentState: Readonly<StorageAgentState> = INITIAL_STATE,
): Readonly<AgentExecutionResult> {
  const selection = selectStorageMode(input);

  const preparedState = transitionStorageState(currentState, {
    currentStorageMode: selection.mode,
    lastOperation: input.operation,
    errorState: null,
    appendLog: `[ORCHESTRATOR] mode=${selection.mode} reason=${selection.reason}`,
  });

  const result = runSelectedAgent(selection.mode, preparedState, input);

  return deepFreeze({
    nextState: result.nextState,
    output: deepFreeze({
      ...result.output,
      logs: deepFreeze([...result.output.logs]),
    }),
  });
}
