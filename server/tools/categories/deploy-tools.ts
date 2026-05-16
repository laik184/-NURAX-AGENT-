import { spawn } from "child_process";
import { getProjectDir } from "../../infrastructure/sandbox/sandbox.util.ts";
import { runtimeManager } from "../../infrastructure/runtime/runtime-manager.ts";
import type { Tool, ToolContext, ToolResult } from "../types.ts";

function runCmd(cmd: string, args: string[], cwd: string, signal?: AbortSignal): Promise<{ ok: boolean; stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    const proc = spawn(cmd, args, { cwd, shell: false, env: { ...process.env } });
    proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });
    signal?.addEventListener("abort", () => proc.kill("SIGKILL"));
    proc.on("close", (code) => resolve({ ok: code === 0, stdout: stdout.slice(0, 5000), stderr: stderr.slice(0, 2000), exitCode: code ?? 1 }));
    proc.on("error", (e) => resolve({ ok: false, stdout: "", stderr: e.message, exitCode: 1 }));
  });
}

export const deployBuild: Tool = {
  name: "deploy_build",
  description: "Run the production build for the project (`npm run build`). Verify it completes without errors before deploying.",
  parameters: { type: "object", properties: {} },
  async run(_args, ctx: ToolContext): Promise<ToolResult> {
    const projectDir = getProjectDir(ctx.projectId);
    const { ok, stdout, stderr, exitCode } = await runCmd("npm", ["run", "build"], projectDir, ctx.signal);
    return { ok, result: { built: ok, stdout: stdout.slice(0, 3000), stderr: stderr.slice(0, 1000), exitCode }, error: ok ? undefined : stderr.slice(0, 500) };
  },
};

export const deployStatus: Tool = {
  name: "deploy_status",
  description: "Check the current deploy/runtime status of the project — whether the dev server is running, on which port, and for how long.",
  parameters: { type: "object", properties: {} },
  async run(_args, ctx: ToolContext): Promise<ToolResult> {
    const entry = runtimeManager.get(ctx.projectId);
    if (!entry) return { ok: true, result: { status: "stopped", message: "No server is running." } };
    return {
      ok: true,
      result: {
        status:   entry.status,
        port:     entry.port,
        pid:      entry.pid,
        uptimeMs: entry.uptimeMs,
        url:      entry.port ? runtimeManager.previewUrl(ctx.projectId, entry.port) : null,
      },
    };
  },
};

export const deployTypecheck: Tool = {
  name: "deploy_typecheck",
  description: "Run TypeScript type-checking on the project (`npx tsc --noEmit`). Surfaces type errors before deployment.",
  parameters: { type: "object", properties: {} },
  async run(_args, ctx: ToolContext): Promise<ToolResult> {
    const projectDir = getProjectDir(ctx.projectId);
    const { ok, stdout, stderr, exitCode } = await runCmd("npx", ["tsc", "--noEmit"], projectDir, ctx.signal);
    return { ok, result: { passed: ok, stdout, stderr, exitCode }, error: ok ? undefined : stderr.slice(0, 1000) };
  },
};
