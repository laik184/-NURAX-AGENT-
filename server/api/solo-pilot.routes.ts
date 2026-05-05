import { Router, type Request, type Response } from "express";
import { spawn } from "child_process";
import { projectRoot, ensureProjectDir } from "../infrastructure/sandbox/sandbox.util.ts";
import { bus } from "../infrastructure/events/bus.ts";

interface ExecSession {
  sessionId: string;
  projectId: number;
  command: string;
  args: string[];
  startedAt: number;
  child: ReturnType<typeof spawn>;
  output: string[];
}

const sessions = new Map<string, ExecSession>();

const ALLOWED_COMMANDS = new Set<string>([
  "node", "npm", "npx", "pnpm", "yarn", "tsx", "tsc", "vite",
  "git", "ls", "cat", "head", "tail", "echo", "pwd",
  "mkdir", "rm", "mv", "cp", "touch", "grep", "find", "wc", "which",
  "python", "python3", "pip",
]);

const ARG_DENY_RE = /[;&|`$<>(){}\\]|\$\(/;

function validateExec(command?: string, args?: string[]): { ok: boolean; reason?: string } {
  if (!command || typeof command !== "string") {
    return { ok: false, reason: "command must be a non-empty string" };
  }
  if (command.includes("/") || command.includes("\\") || command.includes("..")) {
    return { ok: false, reason: `command must be a bare binary name, got "${command}"` };
  }
  if (!ALLOWED_COMMANDS.has(command)) {
    return {
      ok: false,
      reason: `command "${command}" is not in the allow-list. Allowed: ${[...ALLOWED_COMMANDS].sort().join(", ")}`,
    };
  }
  if (args) {
    if (!Array.isArray(args)) return { ok: false, reason: "args must be an array of strings" };
    for (const a of args) {
      if (typeof a !== "string") return { ok: false, reason: "every arg must be a string" };
      if (ARG_DENY_RE.test(a)) {
        return { ok: false, reason: `arg contains forbidden shell metacharacters: ${a}` };
      }
    }
  }
  return { ok: true };
}

export function getExecSession(sessionId: string): ExecSession | undefined {
  return sessions.get(sessionId);
}

export function createSoloPilotRouter(): Router {
  const r = Router();

  r.post("/execute", async (req: Request, res: Response) => {
    const { projectId, command, args } = (req.body || {}) as {
      projectId?: number;
      command?: string;
      args?: string[];
    };
    if (!projectId || !command) {
      return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "projectId and command required" } });
    }
    const check = validateExec(command, args);
    if (!check.ok) {
      return res.status(403).json({ ok: false, error: { code: "FORBIDDEN_COMMAND", message: check.reason } });
    }
    await ensureProjectDir(projectId);
    const sessionId = `exec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const child = spawn(command, args || [], {
      cwd: projectRoot(projectId),
      shell: false,
      env: { ...process.env, PATH: process.env.PATH },
    });
    const session: ExecSession = {
      sessionId,
      projectId,
      command,
      args: args || [],
      startedAt: Date.now(),
      child,
      output: [],
    };
    sessions.set(sessionId, session);

    child.stdout?.on("data", (chunk: Buffer) => {
      const line = chunk.toString();
      session.output.push(line);
      bus.emit("console.log", { projectId, stream: "stdout", line, ts: Date.now() });
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      const line = chunk.toString();
      session.output.push(line);
      bus.emit("console.log", { projectId, stream: "stderr", line, ts: Date.now() });
    });
    child.on("exit", (code) => {
      bus.emit("console.log", {
        projectId,
        stream: "stdout",
        line: `\n[exit ${code}]\n`,
        ts: Date.now(),
      });
      setTimeout(() => sessions.delete(sessionId), 60_000);
    });

    res.json({ ok: true, data: { sessionId, startedAt: session.startedAt } });
  });

  return r;
}
