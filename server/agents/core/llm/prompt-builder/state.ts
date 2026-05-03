import type { PromptBuilderState, PromptBuilderStatus, PromptContext } from "./types.js";

const baseState: PromptBuilderState = Object.freeze({
  systemPrompt: "",
  userPrompt: "",
  context: Object.freeze([]),
  finalPrompt: "",
  tokenCount: 0,
  status: "IDLE",
  logs: Object.freeze([]),
  errors: Object.freeze([]),
});

let state: PromptBuilderState = baseState;

function withState(patch: Partial<PromptBuilderState>): void {
  state = Object.freeze({ ...state, ...patch });
}

export function resetPromptBuilderState(): void {
  state = baseState;
}

export function setStatus(status: PromptBuilderStatus): void {
  withState({ status });
}

export function setSystemPrompt(systemPrompt: string): void {
  withState({ systemPrompt });
}

export function setUserPrompt(userPrompt: string): void {
  withState({ userPrompt });
}

export function setContext(context: readonly PromptContext[]): void {
  withState({ context: Object.freeze([...context]) });
}

export function setFinalPrompt(finalPrompt: string): void {
  withState({ finalPrompt });
}

export function setTokenCount(tokenCount: number): void {
  withState({ tokenCount });
}

export function appendLog(message: string): void {
  withState({ logs: Object.freeze([...state.logs, message]) });
}

export function appendError(message: string): void {
  withState({ errors: Object.freeze([...state.errors, message]) });
}

export function getPromptBuilderState(): PromptBuilderState {
  return state;
}
