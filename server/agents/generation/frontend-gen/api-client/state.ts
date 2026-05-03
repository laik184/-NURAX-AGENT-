import type { ApiClientState } from "./types.js";

export const INITIAL_STATE: Readonly<ApiClientState> = Object.freeze({
  endpoints: Object.freeze([]),
  generatedFiles: Object.freeze([]),
  status: "IDLE",
  logs: Object.freeze([]),
  errors: Object.freeze([]),
});

export function transitionState(
  current: Readonly<ApiClientState>,
  patch: Partial<ApiClientState>,
): Readonly<ApiClientState> {
  return Object.freeze({
    ...current,
    ...patch,
    endpoints: Object.freeze([...(patch.endpoints ?? current.endpoints)]),
    generatedFiles: Object.freeze([...(patch.generatedFiles ?? current.generatedFiles)]),
    logs: Object.freeze([...(patch.logs ?? current.logs)]),
    errors: Object.freeze([...(patch.errors ?? current.errors)]),
  });
}
