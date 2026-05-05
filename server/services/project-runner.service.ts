import { spawn } from "node:child_process";
import { bus } from "../infrastructure/events/bus.ts";
import { ensureProjectDir, projectRoot } from "../infrastructure/sandbox/sandbox.util.ts";
import { detectCommand, ensureNodeModules } from "./project-runner/command-detect.ts";
import { findFreePort, releasePort, reservePort } from "./project-runner/port-allocator.ts";
import {
  getEntry,
  listEntries,
  pushLine,
  removeEntry,
  setEntry,
} from "./project-runner/process-registry.ts";
import {
  PORT_RANGE_END,
  PORT_RANGE_START,
  type ProjectProcess,
} from "./project-runner/types.ts";

export type { ProjectProcess } from "./project-runner/types.ts";

function emit(projectId: number, kind: "stdout" | "stderr", line: string): void {
  bus.emit("console.log", { projectId, stream: kind, line, ts: Date.now() });
}

export const projectRunner = {
  list(): ProjectProcess[] {
    return listEntries().map((p) => p.meta);
  },

  get(projectId: number): ProjectProcess | undefined {
    return getEntry(projectId)?.meta;
  },

  async start(
    projectId: number,
    opts: { command?: string; args?: string[]; port?: number; cwd?: string } = {},
  ): Promise<ProjectProcess> {
    const existing = getEntry(projectId);
    if (existing) {
      if (existing.meta.status === "running" || existing.meta.status === "starting") {
        return existing.meta;
      }
      removeEntry(projectId);
      releasePort(existing.meta.port);
    }

    const cwd = opts.cwd || (await ensureProjectDir(projectId));
    const port = opts.port ?? (await findFreePort(PORT_RANGE_START, PORT_RANGE_END));
    reservePort(port);

    let cmd = opts.command;
    let args = opts.args;
    if (!cmd) {
      const detected = await detectCommand(cwd);
      cmd = detected.cmd;
      args = detected.args;
    }
    args = (args || []).map((a) => a.replace("{PORT}", String(port)));

    await ensureNodeModules(cwd);

    const meta: ProjectProcess = {
      projectId,
      pid: null,
      status: "starting",
      command: cmd,
      args,
      port,
      startedAt: Date.now(),
      exitCode: null,
      lastLines: [],
    };

    const child = spawn(cmd, args, {
      cwd,
      env: {
        ...process.env,
        PORT: String(port),
        HOST: "0.0.0.0",
        NODE_ENV: "development",
        BROWSER: "none",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    meta.pid = child.pid ?? null;
    setEntry(projectId, { handle: child, meta });

    emit(projectId, "stdout", `[runner] starting "${cmd} ${args.join(" ")}" on port ${port}`);

    const wireStream = (stream: NodeJS.ReadableStream, kind: "stdout" | "stderr"): void => {
      let buf = "";
      stream.on("data", (chunk: Buffer) => {
        buf += chunk.toString("utf-8");
        const lines = buf.split(/\r?\n/);
        buf = lines.pop() || "";
        for (const line of lines) {
          if (!line) continue;
          pushLine(meta, line);
          emit(projectId, kind, line);
          if (meta.status === "starting" && /listening|ready|started|on port/i.test(line)) {
            meta.status = "running";
          }
        }
      });
    };
    if (child.stdout) wireStream(child.stdout, "stdout");
    if (child.stderr) wireStream(child.stderr, "stderr");

    setTimeout(() => {
      if (meta.status === "starting") meta.status = "running";
    }, 2000);

    child.on("exit", (code) => {
      meta.exitCode = code;
      meta.status = code === 0 ? "stopped" : "crashed";
      emit(projectId, "stdout", `[runner] process exited with code ${code}`);
      releasePort(port);
    });

    child.on("error", (err) => {
      meta.status = "crashed";
      emit(projectId, "stderr", `[runner] spawn error: ${err.message}`);
    });

    return meta;
  },

  async stop(projectId: number): Promise<ProjectProcess | null> {
    const entry = getEntry(projectId);
    if (!entry) return null;
    const { handle, meta } = entry;
    if (handle.exitCode === null && !handle.killed) {
      try {
        handle.kill("SIGTERM");
      } catch {
        /* ignore */
      }
      setTimeout(() => {
        try {
          if (handle.exitCode === null && !handle.killed) handle.kill("SIGKILL");
        } catch {
          /* ignore */
        }
      }, 4000);
    }
    meta.status = "stopped";
    releasePort(meta.port);
    return meta;
  },

  async restart(projectId: number): Promise<ProjectProcess> {
    await this.stop(projectId);
    await new Promise((r) => setTimeout(r, 800));
    return this.start(projectId);
  },

  tunnelInfo(projectId: number): {
    available: boolean;
    url: string;
    proxyUrl: string;
    port: number | null;
    status: ProjectProcess["status"] | "stopped";
  } {
    const meta = getEntry(projectId)?.meta;
    return {
      available: !!meta && meta.status === "running",
      url: meta ? `http://127.0.0.1:${meta.port}` : "",
      proxyUrl: `/preview/${projectId}/`,
      port: meta?.port ?? null,
      status: meta?.status ?? "stopped",
    };
  },

  recentLogs(projectId: number, limit = 200): string[] {
    const meta = getEntry(projectId)?.meta;
    if (!meta) return [];
    return meta.lastLines.slice(-limit);
  },
};

function shutdownAll(): void {
  for (const { handle } of listEntries()) {
    try {
      handle.kill("SIGTERM");
    } catch {
      /* ignore */
    }
  }
}
process.on("SIGTERM", shutdownAll);
process.on("SIGINT", shutdownAll);

export { projectRoot };
