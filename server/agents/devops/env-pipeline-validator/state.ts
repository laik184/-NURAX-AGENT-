import type { EnvValidatorState, StatePatch } from "./types.js";

export const INITIAL_STATE: Readonly<EnvValidatorState> = Object.freeze({
  env: Object.freeze({}),
  missing: Object.freeze([]),
  invalid: Object.freeze([]),
  warnings: Object.freeze([]),
  status: "IDLE",
  logs: Object.freeze([]),
  errors: Object.freeze([]),
});

export function transitionState(
  current: Readonly<EnvValidatorState>,
  patch: StatePatch,
): Readonly<EnvValidatorState> {
  const nextLogs = patch.appendLog
    ? Object.freeze([...current.logs, patch.appendLog])
    : current.logs;

  const nextErrors = patch.appendError
    ? Object.freeze([...current.errors, patch.appendError])
    : current.errors;

  return Object.freeze({
    env: patch.env !== undefined ? Object.freeze({ ...patch.env }) : current.env,
    missing:
      patch.missing !== undefined ? Object.freeze([...patch.missing]) : current.missing,
    invalid:
      patch.invalid !== undefined ? Object.freeze([...patch.invalid]) : current.invalid,
    warnings:
      patch.warnings !== undefined ? Object.freeze([...patch.warnings]) : current.warnings,
    status: patch.status ?? current.status,
    logs: nextLogs,
    errors: nextErrors,
  });
}
