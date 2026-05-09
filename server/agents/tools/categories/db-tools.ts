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

export const dbPush: Tool = {
  name: "db_push",
  description: "Push the Drizzle ORM schema to the database (drizzle-kit push). Applies schema changes without migrations.",
  parameters: {
    type: "object",
    properties: {
      config: { type: "string", description: "Path to drizzle config file (default: drizzle.config.ts)" },
    },
  },
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    const projectDir = getProjectDir(ctx.projectId);
    const configFlag = args.config ? ["--config", args.config as string] : [];
    const { ok, stdout, stderr, exitCode } = await runCmd(
      "npx", ["drizzle-kit", "push", ...configFlag, "--force"],
      projectDir, ctx.signal
    );
    return {
      ok,
      result: { pushed: ok, stdout, stderr, exitCode },
      error: ok ? undefined : stderr.slice(0, 500),
    };
  },
};

export const dbMigrate: Tool = {
  name: "db_migrate",
  description: "Generate and apply Drizzle ORM migrations. Runs drizzle-kit generate then migrate.",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["generate", "migrate", "both"],
        description: "Action to perform (default: both)",
      },
      config: { type: "string", description: "Path to drizzle config file (default: drizzle.config.ts)" },
    },
  },
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    const projectDir = getProjectDir(ctx.projectId);
    const action = (args.action as string) || "both";
    const configFlag = args.config ? ["--config", args.config as string] : [];
    const results: Array<{ step: string; ok: boolean; stdout: string; stderr: string }> = [];

    if (action === "generate" || action === "both") {
      const r = await runCmd("npx", ["drizzle-kit", "generate", ...configFlag], projectDir, ctx.signal);
      results.push({ step: "generate", ok: r.ok, stdout: r.stdout, stderr: r.stderr });
    }

    if (action === "migrate" || action === "both") {
      const r = await runCmd("npx", ["drizzle-kit", "migrate", ...configFlag], projectDir, ctx.signal);
      results.push({ step: "migrate", ok: r.ok, stdout: r.stdout, stderr: r.stderr });
    }

    const allOk = results.every((r) => r.ok);
    return {
      ok: allOk,
      result: { steps: results },
      error: allOk ? undefined : results.find((r) => !r.ok)?.stderr.slice(0, 500),
    };
  },
};
