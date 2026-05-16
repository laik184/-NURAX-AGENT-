import { spawn } from "child_process";
import os from "os";
import { getProjectDir } from "../../infrastructure/sandbox/sandbox.util.ts";
import type { Tool, ToolContext, ToolResult } from "../types.ts";

interface RunResult { ok: boolean; stdout: string; stderr: string; exitCode: number | null }

function runCmd(cmd: string, cmdArgs: string[], cwd: string, timeoutMs: number, signal?: AbortSignal): Promise<RunResult> {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let timer: ReturnType<typeof setTimeout>;
    const proc = spawn(cmd, cmdArgs, { cwd, shell: false, env: { ...process.env, CI: "true" } });
    proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });
    timer = setTimeout(() => { proc.kill("SIGTERM"); resolve({ ok: false, stdout, stderr: stderr + "\n[TIMEOUT]", exitCode: null }); }, timeoutMs);
    signal?.addEventListener("abort", () => { clearTimeout(timer); proc.kill("SIGKILL"); resolve({ ok: false, stdout, stderr: "Aborted", exitCode: null }); });
    proc.on("close", (code) => { clearTimeout(timer); resolve({ ok: code === 0, stdout: stdout.slice(0, 8000), stderr: stderr.slice(0, 2000), exitCode: code }); });
    proc.on("error", (e) => { clearTimeout(timer); resolve({ ok: false, stdout: "", stderr: e.message, exitCode: 1 }); });
  });
}

export const testRun: Tool = {
  name: "test_run",
  description: "Run the project's test suite (`npm test`). Supports optional pattern filtering.",
  parameters: {
    type: "object",
    properties: {
      pattern:   { type: "string", description: "Test file/name pattern filter (passed to test runner)" },
      timeoutMs: { type: "number", description: "Max timeout in ms (default 60000)" },
    },
  },
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    const projectDir = getProjectDir(ctx.projectId);
    const timeoutMs  = (args.timeoutMs as number) || 60_000;
    const cmdArgs    = ["test", "--forceExit", "--passWithNoTests", ...(args.pattern ? ["--testPathPattern", args.pattern as string] : [])];
    const { ok, stdout, stderr, exitCode } = await runCmd("npx", ["jest", ...cmdArgs.slice(1)], projectDir, timeoutMs, ctx.signal);
    return { ok, result: { passed: ok, stdout, stderr, exitCode }, error: ok ? undefined : stderr.slice(0, 500) };
  },
};

export const testLint: Tool = {
  name: "test_lint",
  description: "Run ESLint on the project to surface code style and static-analysis issues.",
  parameters: {
    type: "object",
    properties: {
      path:   { type: "string", description: "Path to lint (default: src/)" },
      fix:    { type: "boolean", description: "Auto-fix issues where possible" },
    },
  },
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    const projectDir = getProjectDir(ctx.projectId);
    const lintPath   = (args.path as string) || "src/";
    const cmdArgs    = ["eslint", lintPath, "--ext", ".ts,.tsx,.js,.jsx", "--max-warnings=0", ...(args.fix ? ["--fix"] : [])];
    const { ok, stdout, stderr, exitCode } = await runCmd("npx", cmdArgs, projectDir, 60_000, ctx.signal);
    return { ok, result: { passed: ok, stdout, stderr, exitCode }, error: ok ? undefined : stdout.slice(0, 1000) };
  },
};

export const testCoverage: Tool = {
  name: "test_coverage",
  description: "Run tests with coverage reporting. Returns a coverage summary.",
  parameters: { type: "object", properties: {} },
  async run(_args, ctx: ToolContext): Promise<ToolResult> {
    const projectDir = getProjectDir(ctx.projectId);
    const cpus       = Math.max(1, os.cpus().length - 1);
    const cmdArgs    = ["jest", "--coverage", "--coverageReporters=text-summary", `--maxWorkers=${cpus}`, "--forceExit", "--passWithNoTests"];
    const { ok, stdout, stderr, exitCode } = await runCmd("npx", cmdArgs, projectDir, 120_000, ctx.signal);
    const summary    = (stdout + stderr).match(/Coverage summary[\s\S]+?Branches[\s\S]+?\n/)?.[0] || "No coverage summary found.";
    return { ok, result: { passed: ok, summary, stdout: stdout.slice(0, 3000), exitCode }, error: ok ? undefined : stderr.slice(0, 500) };
  },
};
