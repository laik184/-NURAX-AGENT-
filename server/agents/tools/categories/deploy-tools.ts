import { spawn } from "child_process";
import { getProjectDir } from "../../../infrastructure/sandbox/sandbox.util.ts";
import { runtimeManager } from "../../../infrastructure/runtime/runtime-manager.ts";
import type { Tool, ToolContext, ToolResult } from "../types.ts";

function runCmd(
  cmd: string,
  args: string[],
  cwd: string,
  signal?: AbortSignal,
): Promise<{ ok: boolean; stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    const proc = spawn(cmd, args, { cwd, shell: false, env: { ...process.env } });
    proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });
    signal?.addEventListener("abort", () => proc.kill("SIGKILL"));
    proc.on("close", (code) => resolve({ ok: code === 0, stdout: stdout.slice(0, 8000), stderr: stderr.slice(0, 3000), exitCode: code ?? 1 }));
    proc.on("error", (e) => resolve({ ok: false, stdout: "", stderr: e.message, exitCode: 1 }));
  });
}

export const deployPublish: Tool = {
  name: "deploy_publish",
  description:
    "Build the project and report the result. " +
    "NOTE: This tool only runs the build — it does NOT push to a production host. " +
    "Production deployment requires the platform's Deploy button.",
  parameters: {
    type: "object",
    properties: {
      build_command: {
        type: "string",
        description: "Build command (default: npm run build)",
      },
    },
  },

  async run(args, ctx: ToolContext): Promise<ToolResult> {
    const projectDir = getProjectDir(ctx.projectId);
    const buildCmd = (args.build_command as string) || "npm run build";
    const [cmd, ...cmdArgs] = buildCmd.split(" ");

    const buildResult = await runCmd(cmd, cmdArgs, projectDir, ctx.signal);
    const buildStep = {
      step: "build",
      ok: buildResult.ok,
      output: buildResult.stdout + buildResult.stderr,
    };

    if (!buildResult.ok) {
      return {
        ok: false,
        result: { steps: [buildStep] },
        error: `Build failed (exit ${buildResult.exitCode}): ${buildResult.stderr.slice(0, 500)}`,
      };
    }

    const previewUrl = runtimeManager.isRunning(ctx.projectId)
      ? runtimeManager.previewUrl(ctx.projectId)
      : null;

    return {
      ok: true,
      result: {
        built: true,
        deployed: false,
        deploymentSupported: false,
        previewUrl,
        steps: [buildStep],
        message:
          "Build completed successfully. " +
          "This environment does not support automated production deployment — " +
          "use the platform Deploy button to publish to a live URL. " +
          (previewUrl ? `Dev preview available at: ${previewUrl}` : "Start the server to get a preview URL."),
      },
    };
  },
};
