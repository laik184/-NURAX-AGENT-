import type { GenerationStatus } from "./types.js";

export interface CodeGenState {
  readonly requestId: string;
  readonly intent: string;
  readonly filesGenerated: readonly string[];
  readonly status: GenerationStatus;
  readonly logs: readonly string[];
  readonly errors: readonly string[];
}

export function createInitialState(requestId: string, intent: string): CodeGenState {
  return Object.freeze({
    requestId,
    intent,
    filesGenerated: [],
    status: "IDLE" as const,
    logs: [],
    errors: [],
  });
}

export function transitionState(
  current: CodeGenState,
  patch: Partial<Omit<CodeGenState, "requestId" | "intent">>,
): CodeGenState {
  return Object.freeze({
    requestId: current.requestId,
    intent: current.intent,
    filesGenerated: patch.filesGenerated ?? current.filesGenerated,
    status: patch.status ?? current.status,
    logs: patch.logs ?? current.logs,
    errors: patch.errors ?? current.errors,
  });
}
