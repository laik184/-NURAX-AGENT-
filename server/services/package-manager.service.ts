import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { bus } from "../events/bus.ts";
import { ensureProjectDir } from "../sandbox/sandbox.util.ts";

export interface InstallResult {
  ok: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  installed?: string[];
  removed?: string[];
}

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

async function ensurePackageJson(rootDir: string): Promise<void> {
  const pkgPath = path.join(rootDir, "package.json");
  if (!existsSync(pkgPath)) {
    await fs.writeFile(
      pkgPath,
      JSON.stringify(
        { name: `sandbox-${path.basename(rootDir)}`, version: "0.1.0", private: true },
        null,
        2,
      ),
      "utf-8",
    );
  }
}

function runStreaming(
  cmd: string,
  args: string[],
  cwd: string,
  projectId: number,
): Promise<InstallResult> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd,
      env: { ...process.env, FORCE_COLOR: "0" },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    const onLine = (chunk: Buffer, kind: "stdout" | "stderr"): void => {
      const text = chunk.toString("utf-8");
      if (kind === "stdout") stdout += text;
      else stderr += text;
      for (const line of text.split(/\r?\n/)) {
        if (!line) continue;
        bus.emit("console.log", { projectId, stream: kind, line, ts: Date.now() });
      }
    };

    child.stdout?.on("data", (c) => onLine(c, "stdout"));
    child.stderr?.on("data", (c) => onLine(c, "stderr"));

    child.on("error", (err) => {
      bus.emit("console.log", {
        projectId,
        stream: "stderr",
        line: `[npm] spawn error: ${err.message}`,
        ts: Date.now(),
      });
      resolve({ ok: false, exitCode: null, stdout, stderr: stderr + err.message });
    });

    child.on("exit", (code) => {
      resolve({ ok: code === 0, exitCode: code, stdout, stderr });
    });
  });
}

export const packageManager = {
  async list(projectId: number): Promise<{ dependencies: Record<string, string>; devDependencies: Record<string, string> }> {
    const rootDir = await ensureProjectDir(projectId);
    const pkgPath = path.join(rootDir, "package.json");
    if (!existsSync(pkgPath)) {
      return { dependencies: {}, devDependencies: {} };
    }
    try {
      const pkg = JSON.parse(await fs.readFile(pkgPath, "utf-8")) as PackageJson;
      return {
        dependencies: pkg.dependencies || {},
        devDependencies: pkg.devDependencies || {},
      };
    } catch {
      return { dependencies: {}, devDependencies: {} };
    }
  },

  async install(
    projectId: number,
    pkgs: string[] = [],
    opts: { dev?: boolean } = {},
  ): Promise<InstallResult> {
    const rootDir = await ensureProjectDir(projectId);
    await ensurePackageJson(rootDir);

    const args =
      pkgs.length === 0
        ? ["install", "--no-audit", "--no-fund"]
        : [
            "install",
            opts.dev ? "--save-dev" : "--save",
            "--no-audit",
            "--no-fund",
            ...pkgs,
          ];

    bus.emit("console.log", {
      projectId,
      stream: "stdout",
      line: `[npm] npm ${args.join(" ")}`,
      ts: Date.now(),
    });

    const result = await runStreaming("npm", args, rootDir, projectId);
    if (result.ok && pkgs.length) result.installed = pkgs;
    return result;
  },

  async uninstall(projectId: number, pkgs: string[]): Promise<InstallResult> {
    if (!pkgs.length) {
      return { ok: false, exitCode: null, stdout: "", stderr: "no packages provided" };
    }
    const rootDir = await ensureProjectDir(projectId);
    await ensurePackageJson(rootDir);
    const args = ["uninstall", ...pkgs];
    bus.emit("console.log", {
      projectId,
      stream: "stdout",
      line: `[npm] npm ${args.join(" ")}`,
      ts: Date.now(),
    });
    const result = await runStreaming("npm", args, rootDir, projectId);
    if (result.ok) result.removed = pkgs;
    return result;
  },

  async run(projectId: number, script: string): Promise<InstallResult> {
    const rootDir = await ensureProjectDir(projectId);
    await ensurePackageJson(rootDir);
    const args = ["run", script];
    bus.emit("console.log", {
      projectId,
      stream: "stdout",
      line: `[npm] npm ${args.join(" ")}`,
      ts: Date.now(),
    });
    return runStreaming("npm", args, rootDir, projectId);
  },
};
