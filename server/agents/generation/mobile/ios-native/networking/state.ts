import type { EndpointConfig } from "./types.js";

export interface NetworkingState {
  readonly baseURL: string;
  readonly endpoints: readonly EndpointConfig[];
  readonly headers: Readonly<Record<string, string>>;
  readonly authToken?: string;
  readonly status: "IDLE" | "BUILDING" | "COMPLETE" | "FAILED";
  readonly logs: readonly string[];
  readonly errors: readonly string[];
}

export const INITIAL_STATE: Readonly<NetworkingState> = Object.freeze({
  baseURL: "",
  endpoints: Object.freeze([]),
  headers: Object.freeze({}),
  authToken: undefined,
  status: "IDLE",
  logs: Object.freeze([]),
  errors: Object.freeze([]),
});

export function transitionState(
  current: Readonly<NetworkingState>,
  patch: Partial<NetworkingState>,
): Readonly<NetworkingState> {
  return Object.freeze({
    ...current,
    ...patch,
    endpoints: Object.freeze([...(patch.endpoints ?? current.endpoints)]),
    headers: Object.freeze({ ...(patch.headers ?? current.headers) }),
    logs: Object.freeze([...(patch.logs ?? current.logs)]),
    errors: Object.freeze([...(patch.errors ?? current.errors)]),
  });
}
