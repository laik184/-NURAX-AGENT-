import type { ApiEndpoint, KotlinRetrofitState } from "./types.js";

const baseState: KotlinRetrofitState = Object.freeze({
  baseUrl: "",
  endpoints: Object.freeze([]),
  headers: Object.freeze([]),
  interceptors: Object.freeze([]),
  status: "IDLE",
  logs: Object.freeze([]),
  errors: Object.freeze([]),
});

let state: KotlinRetrofitState = baseState;

function withState(patch: Partial<KotlinRetrofitState>): void {
  state = Object.freeze({ ...state, ...patch });
}

export function resetNetworkingState(): void {
  state = baseState;
}

export function setBaseUrl(baseUrl: string): void {
  withState({ baseUrl });
}

export function setEndpoints(endpoints: readonly ApiEndpoint[]): void {
  withState({ endpoints: Object.freeze([...endpoints]) });
}

export function appendHeader(header: Readonly<Record<string, string>>): void {
  withState({ headers: Object.freeze([...state.headers, Object.freeze({ ...header })]) });
}

export function setInterceptors(interceptors: readonly string[]): void {
  withState({ interceptors: Object.freeze([...interceptors]) });
}

export function setStatus(status: KotlinRetrofitState["status"]): void {
  withState({ status });
}

export function appendLog(log: string): void {
  withState({ logs: Object.freeze([...state.logs, log]) });
}

export function appendError(error: string): void {
  withState({ errors: Object.freeze([...state.errors, error]) });
}

export function getNetworkingState(): KotlinRetrofitState {
  return state;
}
