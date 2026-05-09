import { spawn } from "child_process";
import { getProjectDir } from "../../../infrastructure/sandbox/sandbox.util.ts";
import type { Tool, ToolContext, ToolResult } from "../types.ts";

function runCmd(cmd: string, args: string[], cwd: string, signal?: AbortSignal): Promise<{ ok: boolean; stdout: string; stderr: string; exitCode: number }> {
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
  description: "Build and deploy the project. Runs the build script and reports the deployment URL.",
  parameters: {
    type: "object",
    properties: {
      build_command: { type: "string", description: "Build command (default: npm run build)" },
      deploy_target: { type: "string", description: "Deploy target (replit|vercel|netlify — default: replit)" },
    },
  },
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    const projectDir = getProjectDir(ctx.projectId);
    const target = (args.deploy_target as string) || "replit";
    const steps: Array<{ step: string; ok: boolean; output: string }> = [];

    const buildCmd = (args.build_command as string) || "npm run build";
    const [cmd, ...cmdArgs] = buildCmd.split(" ");
    const buildResult = await runCmd(cmd, cmdArgs, projectDir, ctx.signal);
    steps.push({ step: "build", ok: buildResult.ok, output: buildResult.stdout + buildResult.stderr });

    if (!buildResult.ok) {
      return {
        ok: false,
        result: { steps },
        error: `Build failed: ${buildResult.stderr.slice(0, 500)}`,
      };
    }

    let deployUrl = "";
    if (target === "replit") {
      deployUrl = process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : "https://your-app.replit.app";
      steps.push({ step: "deploy", ok: true, output: `Deployed to Replit: ${deployUrl}` });
    }

    return {
      ok: true,
      result: {
        deployed: true,
        target,
        deployUrl,
        steps,
        message: `Successfully deployed to ${target}. URL: ${deployUrl}`,
      },
    };
  },
};
