import type {
  BuildResult,
  DeploymentConfig,
  DeploymentResult,
  RollbackResult,
  RunnerResult,
  VerificationResult,
} from "../types.js";
import { formatLog } from "../utils/log-formatter.util.js";

export interface DeploymentAgentDependencies {
  readonly triggerBuild: (config: DeploymentConfig) => Promise<BuildResult>;
  readonly runDeployment: (config: DeploymentConfig) => Promise<RunnerResult>;
  readonly verifyDeployment: (config: DeploymentConfig) => Promise<VerificationResult>;
  readonly triggerRollback: (config: DeploymentConfig, reason: string) => RollbackResult;
}

export async function executeDeploymentFlow(
  config: DeploymentConfig,
  dependencies: DeploymentAgentDependencies,
): Promise<DeploymentResult> {
  const logs: string[] = [formatLog("deployment-agent", `Starting deployment flow for ${config.environment}`)];

  const build = await dependencies.triggerBuild(config);
  logs.push(...build.logs);
  if (!build.success) {
    return Object.freeze({
      success: false,
      environment: config.environment,
      logs: Object.freeze(logs),
      error: build.error ?? "Build failed",
    });
  }

  const deployment = await dependencies.runDeployment(config);
  logs.push(...deployment.logs);
  if (!deployment.success) {
    const rollback = dependencies.triggerRollback(config, deployment.error ?? "Deployment failed");
    logs.push(...rollback.logs);

    return Object.freeze({
      success: false,
      environment: config.environment,
      logs: Object.freeze(logs),
      error: deployment.error ?? rollback.error ?? "Deployment failed",
    });
  }

  const verification = await dependencies.verifyDeployment(config);
  logs.push(...verification.logs);
  if (!verification.success) {
    const rollback = dependencies.triggerRollback(config, verification.error ?? "Verification failed");
    logs.push(...rollback.logs);

    return Object.freeze({
      success: false,
      environment: config.environment,
      logs: Object.freeze(logs),
      error: verification.error ?? rollback.error ?? "Verification failed",
    });
  }

  logs.push(formatLog("deployment-agent", `Deployment flow completed for ${config.environment}`));

  return Object.freeze({
    success: true,
    environment: config.environment,
    logs: Object.freeze(logs),
  });
}
