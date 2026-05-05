import { spawn } from "node:child_process";
import { ensureProjectDir, projectRoot } from "../../infrastructure/sandbox/sandbox.util.ts";
import { bus } from "../../infrastructure/events/bus.ts";
import type { Tool } from "../types.ts";
import { ARG_DENY_RE, SHELL_ALLOW, asString, asStringArray, trimOutput } from "../util.ts";

export const shellExec: Tool = {
  name: "shell_exec",
  description:
    "Run an allow-listed command (npm, npx, node, git, tsx, ls, cat, etc.) inside the project sandbox. Returns stdout/stderr and exit code. Has a 60s timeout.",
  parameters: {
    type: "object",
    properties: {
      command: { type: "string", description: "Bare binary name (no path, no shell metacharacters)." },
      args: { type: "array", items: { type: "string" }, description: "Argv array." },
      timeoutMs: { type: "number", description: "Max wait. Default 60000." },
    },
    required: ["command"],
  },
  async run(args, ctx) {
    const command = asString(args.command, "command");
    const argv = args.args ? asStringArray(args.args, "args") : [];
    const timeoutMs = typeof args.timeoutMs === "number" ? Math.min(args.timeoutMs, 120_000) : 60_000;
    if (command.includes("/") || command.includes("..")) {
      return { ok: false, error: `command must be a bare binary name, got "${command}"` };
    }
    if (!SHELL_ALLOW.has(command)) {
      return { ok: false, error: `command "${command}" is not in the allow-list` };
    }
    for (const a of argv) {
      if (ARG_DENY_RE.test(a)) return { ok: false, error: `arg has forbidden characters: ${a}` };
    }
    await ensureProjectDir(ctx.projectId);
    return new Promise((resolve) => {
      const child = spawn(command, argv, {
        cwd: projectRoot(ctx.projectId),
        shell: false,
        env: { ...process.env, FORCE_COLOR: "0" },
        stdio: ["ignore", "pipe", "pipe"],
      });
      let stdout = "";
      let stderr = "";
      const timer = setTimeout(() => {
        try { child.kill("SIGKILL"); } catch { /* ignore */ }
      }, timeoutMs);
      child.stdout?.on("data", (c: Buffer) => {
        const t = c.toString();
        stdout += t;
        for (const line of t.split(/\r?\n/)) {
          if (line) bus.emit("console.log", { projectId: ctx.projectId, stream: "stdout", line, ts: Date.now() });
        }
      });
      child.stderr?.on("data", (c: Buffer) => {
        const t = c.toString();
        stderr += t;
        for (const line of t.split(/\r?\n/)) {
          if (line) bus.emit("console.log", { projectId: ctx.projectId, stream: "stderr", line, ts: Date.now() });
        }
      });
      child.on("error", (e: Error) => {
        clearTimeout(timer);
        resolve({ ok: false, error: e.message, result: { stdout, stderr } });
      });
      child.on("exit", (code) => {
        clearTimeout(timer);
        resolve({
          ok: code === 0,
          result: { exitCode: code, stdout: trimOutput(stdout), stderr: trimOutput(stderr) },
          error: code === 0 ? undefined : `exit code ${code}`,
        });
      });
    });
  },
};

export const SHELL_TOOLS: readonly Tool[] = Object.freeze([shellExec]);
