import type { DeploymentConfig, RunnerResult } from "../types.ts";
import { formatLog } from "../utils/log-formatter.util.ts";

/**
 * deploy-runner.agent.ts
 *
 * This agent previously imported from `../../../../deployer/runtime/execution/index.js`
 * and `../../../../deployer/infra/infrastructure/index.js` — directories that do not
 * exist in this codebase. Those imports would throw MODULE_NOT_FOUND at runtime.
 *
 * The correct deployment path for this platform is:
 *   1. Build the project via the agent `deploy_publish` tool (runs npm run build)
 *   2. Preview the result via `server_start` + `preview_url`
 *   3. Production deployment requires the platform's Deploy button — it cannot be
 *      automated from inside the IDE sandbox without a real deployment provider.
 *
 * This function returns an explicit UNSUPPORTED result so callers receive an honest
 * error rather than a MODULE_NOT_FOUND crash or a fabricated success response.
 */
export async function runDeployment(config: DeploymentConfig): Promise<RunnerResult> {
  return Object.freeze({
    success: false,
    logs: Object.freeze([
      formatLog("deploy-runner", `Deployment requested for app "${config.appId}" in environment "${config.environment}"`),
      formatLog("deploy-runner", "UNSUPPORTED: No deployment provider is configured for this platform."),
      formatLog("deploy-runner", "To build the project, use the deploy_publish tool (runs npm run build)."),
      formatLog("deploy-runner", "To deploy to production, use the platform Deploy button."),
    ]),
    error:
      "Deployment provider not configured. " +
      "This platform does not support automated production deployment from inside the IDE sandbox. " +
      "Use the platform Deploy button for a real production URL.",
  });
}
