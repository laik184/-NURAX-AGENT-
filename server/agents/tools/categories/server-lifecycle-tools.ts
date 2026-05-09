import { spawn, type ChildProcess } from "child_process";
import { getProjectDir } from "../../../infrastructure/sandbox/sandbox.util.ts";
import { setProjectPort } from "../../../infrastructure/proxy/preview-proxy.ts";
import { bus } from "../../../infrastructure/events/bus.ts";
import type { Tool, ToolContext, ToolResult } from "../types.ts";

interface ServerState {
  process: ChildProcess;
  port: number;
  logs: string[];
  startedAt: number;
}

const servers = new Map<number, ServerState>();

function allocatePort(projectId: number): number {
  return 5000 + (projectId % 1000);
}

function startProcess(projectId: number): ServerState {
  const projectDir = getProjectDir(projectId);
  const port = allocatePort(projectId);
  const logs: string[] = [];

  const proc = spawn("npm", ["run", "dev"], {
    cwd: projectDir,
    env: { ...process.env, PORT: String(port), NODE_ENV: "development" },
    shell: false,
  });

  function onData(stream: "stdout" | "stderr", data: Buffer): void {
    const line = data.toString().trim();
    logs.push(`[${stream}] ${line}`);
    if (logs.length > 200) logs.shift();
    bus.emit("console.log", { projectId, stream, line, ts: Date.now() });
  }

  proc.stdout.on("data", (d: Buffer) => onData("stdout", d));
  proc.stderr.on("data", (d: Buffer) => onData("stderr", d));
  proc.on("exit", (code) => {
    logs.push(`[process] exited with code ${code}`);
    servers.delete(projectId);
  });

  const state: ServerState = { process: proc, port, logs, startedAt: Date.now() };
  servers.set(projectId, state);
  setProjectPort(projectId, port);
  return state;
}

export const serverStart: Tool = {
  name: "server_start",
  description: "Start the project dev server. Runs `npm run dev` in the project directory.",
  parameters: { type: "object", properties: {} },
  async run(_args, ctx: ToolContext): Promise<ToolResult> {
    const existing = servers.get(ctx.projectId);
    if (existing) {
      return { ok: true, result: { already_running: true, port: existing.port, message: "Server already running." } };
    }
    const state = startProcess(ctx.projectId);
    await new Promise((r) => setTimeout(r, 2000));
    return {
      ok: true,
      result: {
        started: true,
        port: state.port,
        previewUrl: `${process.env.REPLIT_DEV_DOMAIN || `http://localhost:${state.port}`}`,
        message: `Dev server started on port ${state.port}. Use server_logs to check startup.`,
      },
    };
  },
};

export const serverStop: Tool = {
  name: "server_stop",
  description: "Stop the project dev server.",
  parameters: { type: "object", properties: {} },
  async run(_args, ctx: ToolContext): Promise<ToolResult> {
    const state = servers.get(ctx.projectId);
    if (!state) {
      return { ok: true, result: { message: "No running server for this project." } };
    }
    state.process.kill("SIGTERM");
    servers.delete(ctx.projectId);
    return { ok: true, result: { stopped: true, message: "Dev server stopped." } };
  },
};

export const serverRestart: Tool = {
  name: "server_restart",
  description: "Restart the project dev server.",
  parameters: { type: "object", properties: {} },
  async run(_args, ctx: ToolContext): Promise<ToolResult> {
    const existing = servers.get(ctx.projectId);
    if (existing) {
      existing.process.kill("SIGTERM");
      servers.delete(ctx.projectId);
      await new Promise((r) => setTimeout(r, 500));
    }
    const state = startProcess(ctx.projectId);
    await new Promise((r) => setTimeout(r, 2000));
    return {
      ok: true,
      result: {
        restarted: true,
        port: state.port,
        message: `Server restarted on port ${state.port}.`,
      },
    };
  },
};

export const serverLogs: Tool = {
  name: "server_logs",
  description: "Get recent dev server stdout/stderr logs.",
  parameters: {
    type: "object",
    properties: {
      tail: { type: "number", description: "Number of recent lines to return (default 50)" },
    },
  },
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    const state = servers.get(ctx.projectId);
    if (!state) {
      return { ok: true, result: { status: "stopped", lines: [], message: "No running server." } };
    }
    const tail = (args.tail as number) || 50;
    const lines = state.logs.slice(-tail);
    return {
      ok: true,
      result: {
        status: "running",
        port: state.port,
        lines,
        uptimeMs: Date.now() - state.startedAt,
      },
    };
  },
};
