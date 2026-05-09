import { spawn } from "child_process";
import { getProjectDir } from "../../../infrastructure/sandbox/sandbox.util.ts";
import type { Tool, ToolContext, ToolResult } from "../types.ts";

const ALLOWED_COMMANDS = new Set([
  "npm", "npx", "node", "tsx", "ts-node",
  "git", "ls", "cat", "head", "tail", "echo",
  "mkdir", "touch", "grep", "find", "cp", "mv",
  "python", "python3", "pip", "pip3",
  "vite", "next", "tsc", "eslint",
  "drizzle-kit", "prisma",
  "curl", "wget", "which", "env", "printenv",
  "chmod", "pwd", "rm", "df", "du", "ps",
]);

export const shellExec: Tool = {
  name: "shell_exec",
  description: "Run an allow-listed shell command in the project sandbox. Returns stdout, stderr, and exit code.",
  parameters: {
    type: "object",
    properties: {
      command: { type: "string", description: "Command to run (e.g. 'npm')" },
      args: { type: "array", items: { type: "string" }, description: "Arguments array (e.g. ['run', 'dev'])" },
      timeoutMs: { type: "number", description: "Timeout in ms (default 30000)" },
      cwd: { type: "string", description: "Working directory relative to project root (default: project root)" },
    },
    required: ["command"],
  },
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    const command = args.command as string;
    const cmdArgs = (args.args as string[]) || [];
    const timeoutMs = (args.timeoutMs as number) || 30_000;
    const projectDir = getProjectDir(ctx.projectId);
    const cwd = args.cwd ? `${projectDir}/${args.cwd}` : projectDir;

    if (!ALLOWED_COMMANDS.has(command)) {
      return { ok: false, error: `Command '${command}' is not allowed. Allowed: ${[...ALLOWED_COMMANDS].join(", ")}` };
    }

    return new Promise((resolve) => {
      let stdout = "";
      let stderr = "";
      let timedOut = false;

      const proc = spawn(command, cmdArgs, {
        cwd,
        env: { ...process.env, NODE_ENV: process.env.NODE_ENV || "development" },
        shell: false,
      });

      proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
      proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });

      const timer = setTimeout(() => {
        timedOut = true;
        proc.kill("SIGKILL");
      }, timeoutMs);

      proc.on("close", (exitCode) => {
        clearTimeout(timer);
        const MAX = 20_000;
        resolve({
          ok: exitCode === 0,
          result: {
            exitCode: timedOut ? -1 : exitCode,
            stdout: stdout.slice(-MAX),
            stderr: stderr.slice(-MAX),
            timedOut,
          },
          error: exitCode !== 0 && !timedOut ? (stderr || `Exit code ${exitCode}`).slice(0, 500) : undefined,
        });
      });

      proc.on("error", (err) => {
        clearTimeout(timer);
        resolve({ ok: false, error: err.message });
      });
    });
  },
};
