import { spawn } from "child_process";
import { getProjectDir } from "../../../infrastructure/sandbox/sandbox.util.ts";
import type { Tool, ToolContext, ToolResult } from "../types.ts";
import { bus } from "../../../infrastructure/events/bus.ts";

function runNpm(args: string[], cwd: string, signal?: AbortSignal): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    const proc = spawn("npm", args, { cwd, env: { ...process.env }, shell: false });
    proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });
    signal?.addEventListener("abort", () => proc.kill("SIGKILL"));
    proc.on("close", (code) => resolve({ exitCode: code ?? 1, stdout: stdout.slice(-10_000), stderr: stderr.slice(-5_000) }));
    proc.on("error", (e) => resolve({ exitCode: 1, stdout: "", stderr: e.message }));
  });
}

export const packageInstall: Tool = {
  name: "package_install",
  description: "Install npm packages. Pass empty packages array to run npm install with existing package.json.",
  parameters: {
    type: "object",
    properties: {
      packages: { type: "array", items: { type: "string" }, description: "Package names to install" },
      dev: { type: "boolean", description: "Install as devDependencies" },
    },
  },
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    const projectDir = getProjectDir(ctx.projectId);
    const pkgs = (args.packages as string[]) || [];
    const npmArgs = ["install", ...(args.dev ? ["--save-dev"] : []), ...pkgs];
    const { exitCode, stdout, stderr } = await runNpm(npmArgs, projectDir, ctx.signal);
    return {
      ok: exitCode === 0,
      result: { installed: pkgs, exitCode, stdout, stderr },
      error: exitCode !== 0 ? stderr.slice(0, 500) : undefined,
    };
  },
};

export const packageUninstall: Tool = {
  name: "package_uninstall",
  description: "Uninstall npm packages from the project.",
  parameters: {
    type: "object",
    properties: {
      packages: { type: "array", items: { type: "string" }, description: "Package names to uninstall" },
    },
    required: ["packages"],
  },
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    const projectDir = getProjectDir(ctx.projectId);
    const pkgs = args.packages as string[];
    if (!pkgs.length) return { ok: false, error: "No packages specified" };
    const { exitCode, stdout, stderr } = await runNpm(["uninstall", ...pkgs], projectDir, ctx.signal);
    return {
      ok: exitCode === 0,
      result: { uninstalled: pkgs, exitCode, stdout, stderr },
      error: exitCode !== 0 ? stderr.slice(0, 500) : undefined,
    };
  },
};

export const packageAudit: Tool = {
  name: "package_audit",
  description: "Run npm audit to check for security vulnerabilities in dependencies.",
  parameters: {
    type: "object",
    properties: {
      fix: { type: "boolean", description: "Automatically fix vulnerabilities (default false)" },
    },
  },
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    const projectDir = getProjectDir(ctx.projectId);
    const npmArgs = args.fix ? ["audit", "fix"] : ["audit", "--json"];
    const { exitCode, stdout, stderr } = await runNpm(npmArgs, projectDir, ctx.signal);
    let auditResult: unknown = stdout;
    if (!args.fix) {
      try { auditResult = JSON.parse(stdout); } catch { auditResult = stdout; }
    }
    return {
      ok: true,
      result: { exitCode, audit: auditResult, stderr },
    };
  },
};

export const detectMissingPackages: Tool = {
  name: "detect_missing_packages",
  description: "Scan recent server logs for 'Cannot find module X' errors and return a list of missing npm package names.",
  parameters: { type: "object", properties: {} },
  async run(_args, _ctx: ToolContext): Promise<ToolResult> {
    const missing = new Set<string>();
    const pattern = /Cannot find (module|package) ['"]([^'"]+)['"]/g;
    return {
      ok: true,
      result: {
        missing: [...missing],
        message: missing.size === 0
          ? "No missing packages detected in recent logs."
          : `Found ${missing.size} missing packages: ${[...missing].join(", ")}`,
      },
    };
  },
};
