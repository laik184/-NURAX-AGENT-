import {
  buildContainerImage,
  runContainer,
} from "../../../../deployer/runtime/execution/index.js";
import {
  allocateNetworkRoute,
  deployContainer,
  provisionRuntime,
} from "../../../../deployer/infra/infrastructure/index.js";
import type { DeploymentConfig, RunnerResult } from "../types.js";
import { normalizeError } from "../utils/error-normalizer.util.js";
import { formatLog } from "../utils/log-formatter.util.js";

export async function runDeployment(config: DeploymentConfig): Promise<RunnerResult> {
  try {
    const imageTag = config.imageTag ?? `${config.appId}:${config.environment}`;
    const image = await buildContainerImage(config.workspacePath, imageTag);

    if (!image.success || !image.data) {
      return Object.freeze({
        success: false,
        logs: Object.freeze([formatLog("deploy-runner", "Container image build failed"), ...image.logs]),
        error: image.error ?? "Failed to build container image",
      });
    }

    const runtime = await provisionRuntime(config.appId);
    if (!runtime.success || !runtime.data) {
      return Object.freeze({
        success: false,
        logs: Object.freeze([formatLog("deploy-runner", "Runtime provisioning failed"), ...runtime.logs]),
        error: runtime.error ?? "Failed to provision runtime",
      });
    }

    const network = await allocateNetworkRoute(runtime.data.providerId);
    if (!network.success || !network.data) {
      return Object.freeze({
        success: false,
        logs: Object.freeze([formatLog("deploy-runner", "Network allocation failed"), ...network.logs]),
        error: network.error ?? "Failed to allocate network route",
      });
    }

    const containerId = await runContainer(image.data.imageTag, network.data.port, `${config.appId}-${config.environment}`);
    const deployment = await deployContainer(containerId);

    if (!deployment.success) {
      return Object.freeze({
        success: false,
        logs: Object.freeze([formatLog("deploy-runner", "Deployment to provider failed"), ...deployment.logs]),
        error: deployment.error ?? "Failed to deploy container",
      });
    }

    return Object.freeze({
      success: true,
      logs: Object.freeze([
        formatLog("deploy-runner", "Deployment completed successfully"),
        ...image.logs,
        ...runtime.logs,
        ...network.logs,
        ...deployment.logs,
      ]),
      deploymentRef: runtime.data.providerId,
      endpoint: network.data.route,
    });
  } catch (error) {
    return Object.freeze({
      success: false,
      logs: Object.freeze([formatLog("deploy-runner", "Deployment execution threw an exception")]),
      error: normalizeError(error),
    });
  }
}
