import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import { getProjectDir } from "../../../infrastructure/sandbox/sandbox.util.ts";
import type { Tool, ToolContext, ToolResult } from "../types.ts";

function runGit(args: string[], cwd: string, signal?: AbortSignal): Promise<{ ok: boolean; stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    const proc = spawn("git", args, { cwd, shell: false, env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } });
    proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });
    signal?.addEventListener("abort", () => proc.kill("SIGKILL"));
    proc.on("close", (code) => resolve({ ok: code === 0, stdout: stdout.slice(0, 5000), stderr: stderr.slice(0, 2000), exitCode: code ?? 1 }));
    proc.on("error", (e) => resolve({ ok: false, stdout: "", stderr: e.message, exitCode: 1 }));
  });
}

async function ensureGitRepo(cwd: string): Promise<void> {
  const gitDir = path.join(cwd, ".git");
  try {
    await fs.stat(gitDir);
  } catch {
    await new Promise<void>((res, rej) => {
      const proc = spawn("git", ["init"], { cwd, shell: false });
      proc.on("close", (code) => code === 0 ? res() : rej(new Error("git init failed")));
    });
  }
}

export const gitStatus: Tool = {
  name: "git_status",
  description: "Show git working-tree status. Auto-initializes repo if needed.",
  parameters: { type: "object", properties: {} },
  async run(_args, ctx: ToolContext): Promise<ToolResult> {
    const projectDir = getProjectDir(ctx.projectId);
    await ensureGitRepo(projectDir);
    const { stdout, stderr } = await runGit(["status", "--short"], projectDir, ctx.signal);
    return { ok: true, result: { status: stdout || "Clean working tree", info: stderr } };
  },
};

export const gitAdd: Tool = {
  name: "git_add",
  description: "Stage files for commit. Defaults to staging all changes.",
  parameters: {
    type: "object",
    properties: {
      paths: { type: "array", items: { type: "string" }, description: "Files/directories to stage (default: all)" },
    },
  },
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    const projectDir = getProjectDir(ctx.projectId);
    await ensureGitRepo(projectDir);
    const paths = (args.paths as string[]) || ["."];
    const { ok, stdout, stderr, exitCode } = await runGit(["add", ...paths], projectDir, ctx.signal);
    return { ok, result: { staged: paths, stdout, stderr, exitCode }, error: ok ? undefined : stderr };
  },
};

export const gitCommit: Tool = {
  name: "git_commit",
  description: "Create a git commit with the given message.",
  parameters: {
    type: "object",
    properties: {
      message: { type: "string", description: "Commit message" },
      stage_all: { type: "boolean", description: "Stage all changes before committing (default false)" },
    },
    required: ["message"],
  },
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    const projectDir = getProjectDir(ctx.projectId);
    await ensureGitRepo(projectDir);
    if (args.stage_all) {
      await runGit(["add", "."], projectDir, ctx.signal);
    }
    const gitArgs = [
      "-c", "user.email=agent@nura-x.dev",
      "-c", "user.name=NURA-X Agent",
      "commit", "-m", args.message as string,
    ];
    const { ok, stdout, stderr, exitCode } = await runGit(gitArgs, projectDir, ctx.signal);
    return { ok, result: { committed: ok, message: args.message, stdout, exitCode }, error: ok ? undefined : stderr };
  },
};

export const gitClone: Tool = {
  name: "git_clone",
  description: "Clone a git repository into the project sandbox.",
  parameters: {
    type: "object",
    properties: {
      url: { type: "string", description: "Repository URL to clone" },
      directory: { type: "string", description: "Target directory name (default: repo name)" },
    },
    required: ["url"],
  },
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    const projectDir = getProjectDir(ctx.projectId);
    const url = args.url as string;
    const cloneArgs = ["clone", url];
    if (args.directory) cloneArgs.push(args.directory as string);
    const { ok, stdout, stderr, exitCode } = await runGit(cloneArgs, projectDir, ctx.signal);
    return { ok, result: { cloned: ok, url, stdout, exitCode }, error: ok ? undefined : stderr };
  },
};

export const gitPush: Tool = {
  name: "git_push",
  description: "Push commits to the remote repository.",
  parameters: {
    type: "object",
    properties: {
      remote: { type: "string", description: "Remote name (default: origin)" },
      branch: { type: "string", description: "Branch name (default: current branch)" },
      force: { type: "boolean", description: "Force push (default false)" },
    },
  },
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    const projectDir = getProjectDir(ctx.projectId);
    const gitArgs = ["push", (args.remote as string) || "origin"];
    if (args.branch) gitArgs.push(args.branch as string);
    if (args.force) gitArgs.push("--force");
    const { ok, stdout, stderr, exitCode } = await runGit(gitArgs, projectDir, ctx.signal);
    return { ok, result: { pushed: ok, stdout, exitCode }, error: ok ? undefined : stderr };
  },
};

export const gitPull: Tool = {
  name: "git_pull",
  description: "Pull latest changes from the remote repository.",
  parameters: {
    type: "object",
    properties: {
      remote: { type: "string", description: "Remote name (default: origin)" },
      branch: { type: "string", description: "Branch name (default: current branch)" },
    },
  },
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    const projectDir = getProjectDir(ctx.projectId);
    const gitArgs = ["pull", (args.remote as string) || "origin"];
    if (args.branch) gitArgs.push(args.branch as string);
    const { ok, stdout, stderr, exitCode } = await runGit(gitArgs, projectDir, ctx.signal);
    return { ok, result: { pulled: ok, stdout, exitCode }, error: ok ? undefined : stderr };
  },
};
