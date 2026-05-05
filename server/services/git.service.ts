import { spawn } from "node:child_process";
import path from "node:path";
import { existsSync } from "node:fs";
import { bus } from "../infrastructure/events/bus.ts";
import { ensureProjectDir } from "../infrastructure/sandbox/sandbox.util.ts";

export interface GitResult {
  ok: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
}

function runGit(cwd: string, args: string[], projectId?: number): Promise<GitResult> {
  return new Promise((resolve) => {
    const child = spawn("git", args, { cwd, env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (c) => {
      const text = c.toString("utf-8");
      stdout += text;
      if (projectId !== undefined) {
        for (const line of text.split(/\r?\n/)) {
          if (line) bus.emit("console.log", { projectId, stream: "stdout", line: `[git] ${line}`, ts: Date.now() });
        }
      }
    });
    child.stderr?.on("data", (c) => {
      const text = c.toString("utf-8");
      stderr += text;
      if (projectId !== undefined) {
        for (const line of text.split(/\r?\n/)) {
          if (line) bus.emit("console.log", { projectId, stream: "stderr", line: `[git] ${line}`, ts: Date.now() });
        }
      }
    });
    child.on("error", (err) => resolve({ ok: false, exitCode: null, stdout, stderr: stderr + err.message }));
    child.on("exit", (code) => resolve({ ok: code === 0, exitCode: code, stdout, stderr }));
  });
}

async function ensureUserConfig(cwd: string): Promise<void> {
  const email = await runGit(cwd, ["config", "user.email"]);
  if (!email.stdout.trim()) {
    await runGit(cwd, ["config", "user.email", "agent@nura-x.local"]);
  }
  const name = await runGit(cwd, ["config", "user.name"]);
  if (!name.stdout.trim()) {
    await runGit(cwd, ["config", "user.name", "Nura-X Agent"]);
  }
}

export const gitService = {
  async init(projectId: number): Promise<GitResult> {
    const cwd = await ensureProjectDir(projectId);
    if (existsSync(path.join(cwd, ".git"))) {
      return { ok: true, exitCode: 0, stdout: "Repository already initialized\n", stderr: "" };
    }
    const r = await runGit(cwd, ["init", "-b", "main"], projectId);
    if (r.ok) await ensureUserConfig(cwd);
    return r;
  },

  async status(projectId: number): Promise<GitResult> {
    const cwd = await ensureProjectDir(projectId);
    if (!existsSync(path.join(cwd, ".git"))) {
      return { ok: false, exitCode: null, stdout: "", stderr: "Not a git repository" };
    }
    return runGit(cwd, ["status", "--porcelain", "-b"]);
  },

  async commit(projectId: number, message: string): Promise<GitResult & { sha?: string }> {
    const cwd = await ensureProjectDir(projectId);
    if (!existsSync(path.join(cwd, ".git"))) {
      const init = await this.init(projectId);
      if (!init.ok) return init;
    }
    await ensureUserConfig(cwd);
    const add = await runGit(cwd, ["add", "-A"], projectId);
    if (!add.ok) return add;
    const commit = await runGit(
      cwd,
      ["commit", "-m", message || "agent commit", "--allow-empty"],
      projectId,
    );
    if (!commit.ok) return commit;
    const rev = await runGit(cwd, ["rev-parse", "HEAD"]);
    return { ...commit, sha: rev.stdout.trim() };
  },

  async log(projectId: number, limit = 30): Promise<{ ok: boolean; entries: Array<{ sha: string; message: string; date: string }>; raw: string }> {
    const cwd = await ensureProjectDir(projectId);
    if (!existsSync(path.join(cwd, ".git"))) {
      return { ok: false, entries: [], raw: "" };
    }
    const r = await runGit(cwd, ["log", `--max-count=${limit}`, "--pretty=format:%H%x09%aI%x09%s"]);
    const entries = r.stdout
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [sha = "", date = "", ...rest] = line.split("\t");
        return { sha, date, message: rest.join("\t") };
      });
    return { ok: r.ok, entries, raw: r.stdout };
  },
};
