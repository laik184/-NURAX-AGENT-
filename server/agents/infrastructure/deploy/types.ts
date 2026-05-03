export type DeploymentStatus =
  | "IDLE"
  | "BUILDING"
  | "DEPLOYING"
  | "VERIFYING"
  | "SUCCESS"
  | "FAILED"
  | "ROLLBACK";

export interface DeploymentConfig {
  readonly deploymentId: string;
  readonly environment: string;
  readonly workspacePath: string;
  readonly appId: string;
  readonly imageTag?: string;
  readonly serviceUrl?: string;
  readonly port?: number;
  readonly rollbackSnapshotFrom?: string;
  readonly rollbackSnapshotTo?: string;
  readonly requestedBy?: string;
}

export interface BuildResult {
  readonly success: boolean;
  readonly logs: readonly string[];
  readonly artifactPath?: string;
  readonly error?: string;
}

export interface RunnerResult {
  readonly success: boolean;
  readonly logs: readonly string[];
  readonly deploymentRef?: string;
  readonly endpoint?: string;
  readonly error?: string;
}

export interface VerificationResult {
  readonly success: boolean;
  readonly logs: readonly string[];
  readonly latencyMs?: number;
  readonly error?: string;
}

export interface RollbackResult {
  readonly success: boolean;
  readonly logs: readonly string[];
  readonly rollbackId?: string;
  readonly error?: string;
}

export interface DeploymentResult {
  readonly success: boolean;
  readonly environment: string;
  readonly logs: readonly string[];
  readonly error?: string;
}
