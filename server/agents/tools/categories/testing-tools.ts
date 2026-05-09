import { spawn } from "child_process";
import os from "os";
import { getProjectDir } from "../../../infrastructure/sandbox/sandbox.util.ts";
import type { Tool, ToolContext, ToolResult } from "../types.ts";

function runCmd(cmd: string, args: string[], cwd: string, timeoutMs: number, signal?: AbortSignal): Promise<{ ok: boolean; stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const proc = spawn(cmd, args, { cwd, shell: false, env: { ...process.env, CI: "true", NODE_ENV: "test" } });
    proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });
    signal?.addEventListener("abort", () => proc.kill("SIGKILL"));
    const timer = setTimeout(() => { timedOut = true; proc.kill("SIGKILL"); }, timeoutMs);
    proc.on("close", (code) => {
      clearTimeout(timer);
      resolve({ ok: code === 0, stdout: stdout.slice(0, 10_000), stderr: stderr.slice(0, 5_000), exitCode: timedOut ? -1 : (code ?? 1) });
    });
    proc.on("error", (e) => { clearTimeout(timer); resolve({ ok: false, stdout: "", stderr: e.message, exitCode: 1 }); });
  });
}

export const testRun: Tool = {
  name: "test_run",
  description: "Run the project test suite using npm test or a custom command.",
  parameters: {
    type: "object",
    properties: {
      command: { type: "string", description: "Test command (default: npm test)" },
      pattern: { type: "string", description: "Test file pattern or test name filter" },
      timeoutMs: { type: "number", description: "Timeout in ms (default 60000)" },
    },
  },
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    const projectDir = getProjectDir(ctx.projectId);
    const timeoutMs = (args.timeoutMs as number) || 60_000;
    let cmd = "npm";
    let cmdArgs = ["test", "--", "--watchAll=false", "--passWithNoTests"];
    if (args.command) {
      const parts = (args.command as string).split(" ");
      cmd = parts[0];
      cmdArgs = parts.slice(1);
    }
    if (args.pattern && !args.command) {
      cmdArgs.push("--testPathPattern", args.pattern as string);
    }
    const { ok, stdout, stderr, exitCode } = await runCmd(cmd, cmdArgs, projectDir, timeoutMs, ctx.signal);
    const passed = (stdout.match(/\d+ passed/)?.[0]) || null;
    const failed = (stdout.match(/\d+ failed/)?.[0]) || null;
    return {
      ok,
      result: { passed, failed, exitCode, stdout, stderr },
      error: ok ? undefined : `Tests failed (exit ${exitCode})`,
    };
  },
};

export const debugRun: Tool = {
  name: "debug_run",
  description: "Run a Node.js script or command in debug mode and capture output. Useful for debugging specific files.",
  parameters: {
    type: "object",
    properties: {
      script: { type: "string", description: "Script path to run (e.g. src/index.ts)" },
      command: { type: "string", description: "Custom command (overrides script)" },
      env: { type: "object", description: "Additional environment variables" },
      timeoutMs: { type: "number", description: "Timeout in ms (default 30000)" },
    },
  },
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    const projectDir = getProjectDir(ctx.projectId);
    const timeoutMs = (args.timeoutMs as number) || 30_000;
    const extraEnv = (args.env as Record<string, string>) || {};

    let cmd = "node";
    let cmdArgs: string[] = [];

    if (args.command) {
      const parts = (args.command as string).split(" ");
      cmd = parts[0];
      cmdArgs = parts.slice(1);
    } else if (args.script) {
      const script = args.script as string;
      if (script.endsWith(".ts")) {
        cmd = "npx";
        cmdArgs = ["tsx", script];
      } else {
        cmd = "node";
        cmdArgs = [script];
      }
    } else {
      return { ok: false, error: "Either script or command must be provided." };
    }

    return new Promise((resolve) => {
      let stdout = "";
      let stderr = "";
      let timedOut = false;
      const proc = spawn(cmd, cmdArgs, {
        cwd: projectDir,
        shell: false,
        env: { ...process.env, NODE_ENV: "development", ...extraEnv },
      });
      proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
      proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });
      ctx.signal?.addEventListener("abort", () => proc.kill("SIGKILL"));
      const timer = setTimeout(() => { timedOut = true; proc.kill("SIGKILL"); }, timeoutMs);
      proc.on("close", (code) => {
        clearTimeout(timer);
        resolve({
          ok: code === 0,
          result: { exitCode: timedOut ? -1 : code, stdout: stdout.slice(0, 10_000), stderr: stderr.slice(0, 5_000), timedOut },
          error: code !== 0 && !timedOut ? stderr.slice(0, 500) : undefined,
        });
      });
      proc.on("error", (e) => { clearTimeout(timer); resolve({ ok: false, error: e.message }); });
    });
  },
};

export const monitorCheck: Tool = {
  name: "monitor_check",
  description: "Check system health: CPU, memory, disk usage, and running processes.",
  parameters: {
    type: "object",
    properties: {
      include_processes: { type: "boolean", description: "Include top processes (default false)" },
    },
  },
  async run(args, _ctx: ToolContext): Promise<ToolResult> {
    const memTotal = os.totalmem();
    const memFree = os.freemem();
    const memUsed = memTotal - memFree;
    const cpus = os.cpus();
    const loadAvg = os.loadavg();

    const health = {
      memory: {
        totalMB: Math.round(memTotal / 1024 / 1024),
        usedMB: Math.round(memUsed / 1024 / 1024),
        freeMB: Math.round(memFree / 1024 / 1024),
        usedPercent: Math.round((memUsed / memTotal) * 100),
      },
      cpu: {
        cores: cpus.length,
        model: cpus[0]?.model || "unknown",
        loadAvg1m: loadAvg[0].toFixed(2),
        loadAvg5m: loadAvg[1].toFixed(2),
      },
      uptime: {
        systemSeconds: Math.round(os.uptime()),
        processSeconds: Math.round(process.uptime()),
      },
      platform: os.platform(),
      nodeVersion: process.version,
    };

    if (args.include_processes) {
      const procResult = await runCmd("ps", ["aux", "--sort=-%mem", "--no-header"], process.cwd(), 5000);
      const topProcs = procResult.stdout.split("\n").slice(0, 10).join("\n");
      return { ok: true, result: { ...health, topProcesses: topProcs } };
    }

    return { ok: true, result: health };
  },
};
