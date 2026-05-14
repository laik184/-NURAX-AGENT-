import { getProjectDir } from "../../../infrastructure/sandbox/sandbox.util.ts";
import type { Tool, ToolContext, ToolResult } from "../types.ts";
import { spawnWithStream } from "../runtime/shell-log-emitter.ts";

// ─── Shared streaming npm runner ─────────────────────────────────────────────

async function runNpm(
  npmArgs:   string[],
  cwd:       string,
  projectId: number,
  signal?:   AbortSignal,
): Promise<{ exitCode: number | null; stdout: string; stderr: string }> {
  // Respect abort before we even start
  if (signal?.aborted) return { exitCode: 1, stdout: "", stderr: "Aborted" };

  const controller = new AbortController();
  signal?.addEventListener("abort", () => controller.abort());

  // spawnWithStream streams every chunk live to the SSE console
  const result = await spawnWithStream({
    command:   "npm",
    args:      npmArgs,
    cwd,
    projectId,
    timeoutMs: 120_000,
  });

  return {
    exitCode: result.exitCode,
    stdout:   result.stdout,
    stderr:   result.stderr,
  };
}

// ─── Tools ───────────────────────────────────────────────────────────────────

export const packageInstall: Tool = {
  name: "package_install",
  description: "Install npm packages. Streams install progress live to the console. Pass empty packages array to run npm install with existing package.json.",
  parameters: {
    type: "object",
    properties: {
      packages: { type: "array", items: { type: "string" }, description: "Package names to install" },
      dev:      { type: "boolean", description: "Install as devDependencies" },
    },
  },
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    const projectDir = getProjectDir(ctx.projectId);
    const pkgs       = (args.packages as string[]) || [];
    const npmArgs    = ["install", ...(args.dev ? ["--save-dev"] : []), ...pkgs];
    const { exitCode, stdout, stderr } = await runNpm(npmArgs, projectDir, ctx.projectId, ctx.signal);
    return {
      ok:     exitCode === 0,
      result: { installed: pkgs, exitCode, stdout, stderr },
      error:  exitCode !== 0 ? stderr.slice(0, 500) : undefined,
    };
  },
};

export const packageUninstall: Tool = {
  name: "package_uninstall",
  description: "Uninstall npm packages from the project. Streams output live to the console.",
  parameters: {
    type: "object",
    properties: {
      packages: { type: "array", items: { type: "string" }, description: "Package names to uninstall" },
    },
    required: ["packages"],
  },
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    const projectDir = getProjectDir(ctx.projectId);
    const pkgs       = args.packages as string[];
    if (!pkgs.length) return { ok: false, error: "No packages specified" };
    const { exitCode, stdout, stderr } = await runNpm(["uninstall", ...pkgs], projectDir, ctx.projectId, ctx.signal);
    return {
      ok:     exitCode === 0,
      result: { uninstalled: pkgs, exitCode, stdout, stderr },
      error:  exitCode !== 0 ? stderr.slice(0, 500) : undefined,
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
    const npmArgs    = args.fix ? ["audit", "fix"] : ["audit", "--json"];
    const { exitCode, stdout, stderr } = await runNpm(npmArgs, projectDir, ctx.projectId, ctx.signal);
    let auditResult: unknown = stdout;
    if (!args.fix) {
      try { auditResult = JSON.parse(stdout); } catch { auditResult = stdout; }
    }
    return {
      ok:     true,
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
