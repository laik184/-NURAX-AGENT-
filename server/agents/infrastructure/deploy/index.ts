import { DeploymentOrchestrator } from "./orchestrator.js";
import type { DeploymentConfig, DeploymentResult, RollbackResult, VerificationResult } from "./types.js";

const orchestrator = new DeploymentOrchestrator();

export async function deployApp(config: DeploymentConfig): Promise<DeploymentResult> {
  return orchestrator.deploy(config);
}

export async function verifyDeployment(config: DeploymentConfig): Promise<VerificationResult> {
  return orchestrator.verify(config);
}

export function rollbackDeployment(config: DeploymentConfig, reason: string): RollbackResult {
  return orchestrator.rollback(config, reason);
}

export type {
  BuildResult,
  DeploymentConfig,
  DeploymentResult,
  DeploymentStatus,
  RollbackResult,
  RunnerResult,
  VerificationResult,
} from "./types.js";
