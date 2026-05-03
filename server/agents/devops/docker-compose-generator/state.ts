import type { DockerComposeState, StatePatch } from "./types.js";

export const INITIAL_STATE: Readonly<DockerComposeState> = Object.freeze({
  services: Object.freeze([]),
  networks: Object.freeze([]),
  volumes: Object.freeze([]),
  env: Object.freeze({}),
  status: "IDLE",
  logs: Object.freeze([]),
  errors: Object.freeze([]),
});

export function transitionState(
  current: Readonly<DockerComposeState>,
  patch: StatePatch,
): Readonly<DockerComposeState> {
  const nextLogs = patch.appendLog
    ? Object.freeze([...current.logs, patch.appendLog])
    : current.logs;

  const nextErrors = patch.appendError
    ? Object.freeze([...current.errors, patch.appendError])
    : current.errors;

  return Object.freeze({
    services:
      patch.services !== undefined ? Object.freeze([...patch.services]) : current.services,
    networks:
      patch.networks !== undefined ? Object.freeze([...patch.networks]) : current.networks,
    volumes:
      patch.volumes !== undefined ? Object.freeze([...patch.volumes]) : current.volumes,
    env: patch.env !== undefined ? Object.freeze({ ...patch.env }) : current.env,
    status: patch.status ?? current.status,
    logs: nextLogs,
    errors: nextErrors,
  });
}
