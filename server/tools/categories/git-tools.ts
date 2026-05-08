import { spawn } from "node:child_process";
import { ensureProjectDir, projectRoot } from "../../infrastructure/sandbox/sandbox.util.ts";
import type { Tool } from "../types.ts";
import { asString, trimOutput } from "../util.ts";

async function gitRun(cwd: string, args: string[]): Promise<{ ok: boolean; stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve) => {
    const child = spawn("git", args, { cwd, shell: false, stdio: ["ignore", "pipe", "pipe"] });
    let out = "", err = "";
    child.stdout?.on("data", (b: Buffer) => { out += b.toString(); });
    child.stderr?.on("data", (b: Buffer) => { err += b.toString(); });
    child.on("error", (e: Error) => resolve({ ok: false, stdout: out, stderr: e.message, code: -1 }));
    child.on("exit",  (code)     => resolve({ ok: code === 0, stdout: trimOutput(out), stderr: trimOutput(err), code }));
  });
}

export const gitStatus: Tool = {
  name: "git_status",
  description:
    "Show the git status of the project sandbox (staged, unstaged, untracked files). Initialises a git repo automatically if one doesn't exist.",
  parameters: { type: "object", properties: {} },
  async run(_args, ctx) {
    await ensureProjectDir(ctx.projectId);
    const cwd = projectRoot(ctx.projectId);

    // Auto-init if needed
    const initCheck = await gitRun(cwd, ["rev-parse", "--is-inside-work-tree"]);
    if (!initCheck.ok) {
      await gitRun(cwd, ["init"]);
      await gitRun(cwd, ["config", "user.email", "agent@nura-x.ai"]);
      await gitRun(cwd, ["config", "user.name",  "NURA Agent"]);
    }

    const result = await gitRun(cwd, ["status", "--short", "--branch"]);
    return {
      ok: result.ok,
      result: { output: result.stdout || "(nothing to report)", stderr: result.stderr || undefined },
      error: result.ok ? undefined : result.stderr,
    };
  },
};

export const gitAdd: Tool = {
  name: "git_add",
  description:
    "Stage files for a git commit. Defaults to staging all changed files (git add -A). Pass specific paths to stage only those files.",
  parameters: {
    type: "object",
    properties: {
      paths: {
        type: "array",
        items: { type: "string" },
        description: "File/directory paths to stage. Omit to stage everything (git add -A).",
      },
    },
  },
  async run(args, ctx) {
    await ensureProjectDir(ctx.projectId);
    const cwd   = projectRoot(ctx.projectId);
    const paths = Array.isArray(args.paths) ? (args.paths as string[]) : [];

    // Auto-init if needed
    const initCheck = await gitRun(cwd, ["rev-parse", "--is-inside-work-tree"]);
    if (!initCheck.ok) {
      await gitRun(cwd, ["init"]);
      await gitRun(cwd, ["config", "user.email", "agent@nura-x.ai"]);
      await gitRun(cwd, ["config", "user.name",  "NURA Agent"]);
    }

    const addArgs = paths.length > 0 ? paths : ["-A"];
    const result  = await gitRun(cwd, ["add", ...addArgs]);

    // Show what was staged
    const statusResult = await gitRun(cwd, ["status", "--short"]);
    return {
      ok: result.ok,
      result: { staged: paths.length > 0 ? paths : "all", status: statusResult.stdout.trim() },
      error: result.ok ? undefined : result.stderr,
    };
  },
};

export const gitCommit: Tool = {
  name: "git_commit",
  description:
    "Create a git commit with a message. Stages all files first (git add -A) unless files were already staged with git_add. Initialises repo + sets identity if needed.",
  parameters: {
    type: "object",
    properties: {
      message:   { type: "string",  description: "Commit message." },
      stage_all: { type: "boolean", description: "Run git add -A before committing. Default true." },
    },
    required: ["message"],
  },
  async run(args, ctx) {
    const message  = asString(args.message, "message");
    const stageAll = args.stage_all !== false;

    await ensureProjectDir(ctx.projectId);
    const cwd = projectRoot(ctx.projectId);

    // Auto-init if needed
    const initCheck = await gitRun(cwd, ["rev-parse", "--is-inside-work-tree"]);
    if (!initCheck.ok) {
      await gitRun(cwd, ["init"]);
      await gitRun(cwd, ["config", "user.email", "agent@nura-x.ai"]);
      await gitRun(cwd, ["config", "user.name",  "NURA Agent"]);
    }

    if (stageAll) await gitRun(cwd, ["add", "-A"]);

    const result = await gitRun(cwd, ["commit", "-m", message]);
    return {
      ok: result.ok,
      result: { message, output: result.stdout.trim() || result.stderr.trim() },
      error: result.ok ? undefined : `git commit failed: ${result.stderr.trim()}`,
    };
  },
};

export const GIT_TOOLS: readonly Tool[] = Object.freeze([gitStatus, gitAdd, gitCommit]);
