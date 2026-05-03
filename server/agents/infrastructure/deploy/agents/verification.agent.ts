import type { DeploymentConfig, VerificationResult } from "../types.js";
import { httpService, HttpSafetyError } from "../../../../services/index.js";
import { formatLog } from "../utils/log-formatter.util.js";
import { normalizeError } from "../utils/error-normalizer.util.js";
import { timeExecution } from "../utils/timer.util.js";

export async function verifyDeployment(config: DeploymentConfig): Promise<VerificationResult> {
  const healthUrl = config.serviceUrl ?? `http://localhost:${config.port ?? 3000}/health`;

  try {
    const probe = await timeExecution(async () => {
      const response = await httpService.request(healthUrl, {
        method: "GET",
        timeoutMs: 10_000,
      });
      return response.ok;
    });

    if (!probe.value) {
      return Object.freeze({
        success: false,
        logs: Object.freeze([formatLog("verification", `Health check failed for ${healthUrl}`)]),
        latencyMs: probe.durationMs,
        error: `Health check did not return success for ${healthUrl}`,
      });
    }

    return Object.freeze({
      success: true,
      logs: Object.freeze([formatLog("verification", `Deployment verified for ${healthUrl}`)]),
      latencyMs: probe.durationMs,
    });
  } catch (error) {
    const message = error instanceof HttpSafetyError
      ? `Health check blocked by HTTP policy: ${error.message}`
      : `Health check threw for ${healthUrl}`;
    return Object.freeze({
      success: false,
      logs: Object.freeze([formatLog("verification", message)]),
      error: normalizeError(error),
    });
  }
}
