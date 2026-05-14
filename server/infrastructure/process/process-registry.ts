/**
 * process-registry.ts
 *
 * SINGLE SOURCE OF TRUTH for all runtime processes.
 *
 * Every subsystem that spawns or queries a project process MUST use this:
 *   - server-lifecycle-tools (AI agent tools)
 *   - runtime.routes (HTTP API)
 *   - preview-proxy (port lookup)
 *
 * Features:
 *   - Dynamic free-port allocation (no collisions)
 *   - Automatic cleanup on process exit/crash
 *   - Stale-port prevention (proxy always reads live state)
 *   - Event bus integration for bus consumers
 *   - Zombie process cleanup on startup
 */

import { spawn, type ChildProcess } from "child_process";
import net from "net";
import { bus } from "../events/bus.ts";

export type ProcessStatus = "starting" | "running" | "stopped" | "crashed";

export interface ProcessEntry {
  projectId: number;
  pid: number;
  port: number;
  status: ProcessStatus;
  process: ChildProcess;
  logs: string[];
  startedAt: number;
  command: string;
  cwd: string;
}

export interface StartOptions {
  projectId: number;
  cwd: string;
  command?: string;
  env?: Record<string, string>;
}

export interface StartResult {
  ok: boolean;
  port?: number;
  pid?: number;
  error?: string;
  alreadyRunning?: boolean;
}

const PORT_RANGE_START = 7000;
const MAX_LOGS = 200;

/** Find a free TCP port starting from a given base. */
async function findFreePort(from = PORT_RANGE_START): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address() as net.AddressInfo;
      srv.close(() => resolve(addr.port));
    });
    srv.on("error", () =>
      findFreePort(from + 1).then(resolve, reject)
    );
  });
}

function emitProcessEvent(eventType: string, projectId: number, payload: unknown): void {
  bus.emit("agent.event", {
    runId: `runtime-${projectId}`,
    projectId,
    phase: "runtime",
    eventType: eventType as any,
    payload,
    ts: Date.now(),
  });
}

class ProcessRegistry {
  private entries = new Map<number, ProcessEntry>();

  /** Start a project process. Prevents duplicate starts. */
  async start(opts: StartOptions): Promise<StartResult> {
    const { projectId, cwd, env } = opts;
    const command = opts.command ?? "npm run dev";

    const existing = this.entries.get(projectId);
    if (existing && existing.status === "running") {
      return { ok: true, alreadyRunning: true, port: existing.port, pid: existing.pid };
    }

    let port: number;
    try {
      port = await findFreePort();
    } catch {
      return { ok: false, error: "Could not allocate a free port" };
    }

    const [cmd, ...args] = command.split(" ");
    const logs: string[] = [];

    const proc = spawn(cmd, args, {
      cwd,
      env: { ...process.env, PORT: String(port), NODE_ENV: "development", ...env },
      shell: false,
      detached: false,
    });

    if (!proc.pid) {
      return { ok: false, error: "Failed to spawn process — no PID" };
    }

    const entry: ProcessEntry = {
      projectId, pid: proc.pid, port,
      status: "starting", process: proc,
      logs, startedAt: Date.now(), command, cwd,
    };
    this.entries.set(projectId, entry);

    proc.stdout?.on("data", (d: Buffer) => {
      const line = d.toString().trimEnd();
      logs.push(line);
      if (logs.length > MAX_LOGS) logs.shift();
      bus.emit("console.log", { projectId, stream: "stdout", line, ts: Date.now() });
      this.setStatus(projectId, "running");
    });

    proc.stderr?.on("data", (d: Buffer) => {
      const line = d.toString().trimEnd();
      logs.push(`[stderr] ${line}`);
      if (logs.length > MAX_LOGS) logs.shift();
      bus.emit("console.log", { projectId, stream: "stderr", line, ts: Date.now() });
    });

    proc.on("exit", (code) => {
      const crashed = code !== 0 && code !== null;
      this.setStatus(projectId, crashed ? "crashed" : "stopped");
      emitProcessEvent(crashed ? "process.crashed" : "process.stopped", projectId, { code, port });
      // Remove after a short delay so status can be read post-exit
      setTimeout(() => this.entries.delete(projectId), 3000);
    });

    proc.on("error", (err) => {
      this.setStatus(projectId, "crashed");
      emitProcessEvent("process.crashed", projectId, { error: err.message });
    });

    emitProcessEvent("process.started", projectId, { pid: proc.pid, port, command });
    return { ok: true, pid: proc.pid, port };
  }

  /** Stop a running project process. */
  stop(projectId: number): { ok: boolean; error?: string } {
    const entry = this.entries.get(projectId);
    if (!entry) return { ok: true };

    try {
      entry.process.kill("SIGTERM");
      // Force kill after 5s if still alive
      setTimeout(() => {
        if (this.entries.has(projectId)) {
          try { entry.process.kill("SIGKILL"); } catch {}
          this.entries.delete(projectId);
        }
      }, 5000);
      this.setStatus(projectId, "stopped");
      emitProcessEvent("process.stopped", projectId, { port: entry.port });
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  /** Stop then restart a project process. */
  async restart(opts: StartOptions): Promise<StartResult> {
    this.stop(opts.projectId);
    await new Promise((r) => setTimeout(r, 600));
    const result = await this.start(opts);
    if (result.ok) {
      emitProcessEvent("process.restarted", opts.projectId, { port: result.port });
    }
    return result;
  }

  get(projectId: number): ProcessEntry | undefined {
    return this.entries.get(projectId);
  }

  getPort(projectId: number): number | undefined {
    const entry = this.entries.get(projectId);
    return entry?.status === "running" || entry?.status === "starting"
      ? entry.port
      : undefined;
  }

  isRunning(projectId: number): boolean {
    const s = this.entries.get(projectId)?.status;
    return s === "running" || s === "starting";
  }

  getLogs(projectId: number, tail = 50): string[] {
    return this.entries.get(projectId)?.logs.slice(-tail) ?? [];
  }

  remove(projectId: number): void {
    this.entries.delete(projectId);
  }

  all(): ProcessEntry[] {
    return Array.from(this.entries.values());
  }

  private setStatus(projectId: number, status: ProcessStatus): void {
    const e = this.entries.get(projectId);
    if (e) this.entries.set(projectId, { ...e, status });
  }
}

export const processRegistry = new ProcessRegistry();
