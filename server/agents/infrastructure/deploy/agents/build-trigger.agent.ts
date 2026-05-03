import { runBuildProcess } from "../../../../deployer/runtime/execution/index.js";
import type { DeploymentConfig, BuildResult } from "../types.js";
import { normalizeError } from "../utils/error-normalizer.util.js";
import { formatLog } from "../utils/log-formatter.util.js";

export async function triggerBuild(config: DeploymentConfig): Promise<BuildResult> {
  try {
    const result = await runBuildProcess(config.workspacePath);

    if (!result.success) {
      return Object.freeze({
        success: false,
        logs: Object.freeze([
          formatLog("build-trigger", "Build failed during execution phase"),
          ...result.logs,
        ]),
        error: result.error ?? "Build failed",
      });
    }

    return Object.freeze({
      success: true,
      logs: Object.freeze([
        formatLog("build-trigger", "Build completed successfully"),
        ...result.logs,
      ]),
      artifactPath: result.data?.buildPath,
    });
  } catch (error) {
    return Object.freeze({
      success: false,
      logs: Object.freeze([formatLog("build-trigger", "Build execution threw an exception")]),
      error: normalizeError(error),
    });
  }
}
