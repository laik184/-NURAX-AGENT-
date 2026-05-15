import { spawn } from "child_process";
import type { DeploymentConfig, BuildResult } from "../types.ts";
import { normalizeError } from "../utils/error-normalizer.util.ts";
import { formatLog } from "../utils/log-formatter.util.ts";

function runBuildCmd(
  workspacePath: string,
): Promise<{ ok: boolean; stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    const proc = spawn("npm", ["run", "build"], {
      cwd: workspacePath,
      shell: false,
      env: { ...process.env },
    });
    proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });
    proc.on("close", (code) => resolve({
      ok: code === 0,
      stdout: stdout.slice(0, 8000),
      stderr: stderr.slice(0, 3000),
      exitCode: code ?? 1,
    }));
    proc.on("error", (e) => resolve({ ok: false, stdout: "", stderr: e.message, exitCode: 1 }));
  });
}

export async function triggerBuild(config: DeploymentConfig): Promise<BuildResult> {
  if (!config.workspacePath) {
    return Object.freeze({
      success: false,
      logs: Object.freeze([formatLog("build-trigger", "workspacePath is required but was not provided")]),
      error: "workspacePath is required",
    });
  }

  try {
    const result = await runBuildCmd(config.workspacePath);

    if (!result.ok) {
      const errMsg = result.stderr.slice(0, 500) || result.stdout.slice(0, 500) || "npm run build failed";
      return Object.freeze({
        success: false,
        logs: Object.freeze([
          formatLog("build-trigger", `Build failed (exit ${result.exitCode})`),
          formatLog("build-trigger", errMsg),
        ]),
        error: errMsg,
      });
    }

    const lastLine = result.stdout.trim().split("\n").slice(-1)[0] ?? "";
    return Object.freeze({
      success: true,
      logs: Object.freeze([
        formatLog("build-trigger", "Build completed successfully"),
        ...(lastLine ? [formatLog("build-trigger", lastLine.slice(0, 200))] : []),
      ]),
    });
  } catch (error) {
    return Object.freeze({
      success: false,
      logs: Object.freeze([formatLog("build-trigger", "Build execution threw an exception")]),
      error: normalizeError(error),
    });
  }
}
