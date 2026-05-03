import {
  executeDeploymentFlow,
  type DeploymentAgentDependencies,
} from "./agents/deployment-agent.agent.js";
import { resolveEnvironment } from "./agents/environment-resolver.agent.js";
import { runDeployment } from "./agents/deploy-runner.agent.js";
import { triggerBuild } from "./agents/build-trigger.agent.js";
import { triggerRollback } from "./agents/rollback-trigger.agent.js";
import { verifyDeployment } from "./agents/verification.agent.js";
import { createInitialState, transitionState, type DeploymentState } from "./state.js";
import type { DeploymentConfig, DeploymentResult, RollbackResult, VerificationResult } from "./types.js";
import { formatLog } from "./utils/log-formatter.util.js";

export class DeploymentOrchestrator {
  async deploy(request: DeploymentConfig): Promise<DeploymentResult> {
    let state = createInitialState(request.deploymentId, request.environment);

    const resolved = resolveEnvironment(request);
    const resolvedRequest = Object.freeze({
      ...request,
      environment: resolved.environment,
    });

    state = this.updateState(state, {
      status: "BUILDING",
      logs: [...state.logs, ...resolved.logs, formatLog("orchestrator", "Environment resolution complete")],
    });

    const dependencies: DeploymentAgentDependencies = {
      triggerBuild: async (config) => {
        state = this.updateState(state, { status: "BUILDING" });
        return triggerBuild(config);
      },
      runDeployment: async (config) => {
        state = this.updateState(state, { status: "DEPLOYING" });
        return runDeployment(config);
      },
      verifyDeployment: async (config) => {
        state = this.updateState(state, { status: "VERIFYING" });
        return verifyDeployment(config);
      },
      triggerRollback: (config, reason) => {
        state = this.updateState(state, {
          status: "ROLLBACK",
          logs: [...state.logs, formatLog("orchestrator", `Rollback initiated: ${reason}`)],
        });
        return triggerRollback(config, reason);
      },
    };

    const result = await executeDeploymentFlow(resolvedRequest, dependencies);
    state = this.updateState(state, {
      status: result.success ? "SUCCESS" : "FAILED",
      logs: [...state.logs, ...result.logs],
      errors: result.error ? [...state.errors, result.error] : state.errors,
    });

    const output: DeploymentResult = {
      success: result.success,
      environment: state.environment,
      logs: state.logs,
      ...(result.error ? { error: result.error } : {}),
    };

    return Object.freeze(output);
  }

  async verify(config: DeploymentConfig): Promise<VerificationResult> {
    return verifyDeployment(config);
  }

  rollback(config: DeploymentConfig, reason: string): RollbackResult {
    return triggerRollback(config, reason);
  }

  private updateState(
    current: DeploymentState,
    patch: Partial<Omit<DeploymentState, "deploymentId" | "environment">>,
  ): DeploymentState {
    return transitionState(current, patch);
  }
}
