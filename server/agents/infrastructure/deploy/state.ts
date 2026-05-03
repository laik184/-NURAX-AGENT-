import type { DeploymentStatus } from "./types.js";

export interface DeploymentState {
  readonly deploymentId: string;
  readonly environment: string;
  readonly status: DeploymentStatus;
  readonly logs: readonly string[];
  readonly errors: readonly string[];
}

export function createInitialState(deploymentId: string, environment: string): DeploymentState {
  return Object.freeze({
    deploymentId,
    environment,
    status: "IDLE" as const,
    logs: [],
    errors: [],
  });
}

export function transitionState(
  current: DeploymentState,
  patch: Partial<Omit<DeploymentState, "deploymentId" | "environment">>,
): DeploymentState {
  return Object.freeze({
    deploymentId: current.deploymentId,
    environment: current.environment,
    status: patch.status ?? current.status,
    logs: patch.logs ?? current.logs,
    errors: patch.errors ?? current.errors,
  });
}
