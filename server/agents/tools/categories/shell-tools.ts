import { getProjectDir } from "../../../infrastructure/sandbox/sandbox.util.ts";
import type { Tool, ToolContext, ToolResult } from "../types.ts";
import { spawnWithStream } from "../runtime/shell-log-emitter.ts";
import { ALLOWED_COMMANDS, validateCommand } from "../../../tools/registry/tool-security.ts";

export { ALLOWED_COMMANDS };

export const shellExec: Tool = {
  name: "shell_exec",
  description: "Run an allow-listed shell command in the project sandbox. Streams stdout/stderr live to the console. Returns exit code and output.",
  parameters: {
    type: "object",
    properties: {
      command:   { type: "string",  description: "Command to run (e.g. 'npm')" },
      args:      { type: "array",   items: { type: "string" }, description: "Arguments array (e.g. ['run', 'dev'])" },
      timeoutMs: { type: "number",  description: "Timeout in ms (default 30000)" },
      cwd:       { type: "string",  description: "Working directory relative to project root (default: project root)" },
    },
    required: ["command"],
  },

  async run(args, ctx: ToolContext): Promise<ToolResult> {
    const command    = args.command as string;
    const cmdArgs    = (args.args as string[]) || [];
    const timeoutMs  = (args.timeoutMs as number) || 30_000;
    const projectDir = getProjectDir(ctx.projectId);
    const cwd        = args.cwd ? `${projectDir}/${args.cwd}` : projectDir;

    const cmdCheck = validateCommand(command);
    if (!cmdCheck.valid) {
      return { ok: false, error: cmdCheck.reason };
    }

    const { exitCode, stdout, stderr, timedOut } = await spawnWithStream({
      command,
      args: cmdArgs,
      cwd,
      projectId: ctx.projectId,
      env: { ...process.env as NodeJS.ProcessEnv, NODE_ENV: process.env.NODE_ENV || "development" },
      timeoutMs,
    });

    return {
      ok: exitCode === 0 && !timedOut,
      result: {
        exitCode: timedOut ? -1 : exitCode,
        stdout,
        stderr,
        timedOut,
      },
      error: (exitCode !== 0 && !timedOut)
        ? (stderr || `Exit code ${exitCode}`).slice(0, 500)
        : undefined,
    };
  },
};
