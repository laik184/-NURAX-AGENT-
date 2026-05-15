import { spawn } from "child_process";
import { stat, readdir } from "fs/promises";
import * as path from "path";
import { getProjectDir } from "../../../infrastructure/sandbox/sandbox.util.ts";
import type { DeployLogger } from "../logs/deploy-logger.ts";

export interface BuildResult {
  ok: boolean;
  durationMs: number;
  outputSizeKb: number;
  outputDir: string;
  warnings: string[];
  error?: string;
}

function runCmd(
  cmd: string,
  args: string[],
  cwd: string,
): Promise<{ ok: boolean; stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    const proc = spawn(cmd, args, { cwd, shell: false, env: { ...process.env } });
    proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });
    proc.on("close", (code) => resolve({ ok: code === 0, stdout: stdout.slice(0, 8000), stderr: stderr.slice(0, 4000), exitCode: code ?? 1 }));
    proc.on("error", (e) => resolve({ ok: false, stdout: "", stderr: e.message, exitCode: 1 }));
  });
}

async function dirSizeKb(dir: string): Promise<number> {
  try {
    const entries = await readdir(dir, { withFileTypes: true, recursive: true } as any);
    let total = 0;
    for (const entry of entries as any[]) {
      if (entry.isFile && typeof entry.isFile === "function" && entry.isFile()) {
        try {
          const s = await stat(path.join(entry.path ?? dir, entry.name));
          total += s.size;
        } catch { /* skip */ }
      }
    }
    return Math.round(total / 1024);
  } catch {
    return 0;
  }
}

export async function build(
  logger: DeployLogger,
  projectId: number,
  projectName: string,
): Promise<BuildResult> {
  const start = Date.now();
  const projectDir = getProjectDir(projectId);
  const warnings: string[] = [];

  logger.info(`Running security audit on "${projectName}" dependencies...`);
  const auditResult = await runCmd("npm", ["audit", "--json"], projectDir);
  if (!auditResult.ok) {
    try {
      const auditData = JSON.parse(auditResult.stdout);
      const critical = auditData?.metadata?.vulnerabilities?.critical ?? 0;
      const high = auditData?.metadata?.vulnerabilities?.high ?? 0;
      if (critical > 0 || high > 0) {
        const msg = `Found ${critical} critical and ${high} high severity vulnerabilities.`;
        logger.warn(msg);
        warnings.push(msg);
      } else {
        logger.success("Security audit passed. No critical issues found.");
      }
    } catch {
      logger.warn("Security audit unavailable — continuing.");
    }
  } else {
    logger.success("Security audit passed. No critical issues found.");
  }

  logger.info("Running build: npm run build");
  const buildResult = await runCmd("npm", ["run", "build"], projectDir);
  if (!buildResult.ok) {
    const errMsg = buildResult.stderr.slice(0, 400) || buildResult.stdout.slice(0, 400) || "Build script failed";
    logger.error(`Build failed (exit ${buildResult.exitCode}): ${errMsg.split("\n")[0]}`);
    return { ok: false, durationMs: Date.now() - start, outputSizeKb: 0, outputDir: "", warnings, error: errMsg };
  }

  const lastLine = buildResult.stdout.trim().split("\n").slice(-1)[0] ?? "";
  if (lastLine) logger.info(lastLine.slice(0, 120));

  const distDir = path.join(projectDir, "dist");
  let outputDir = "dist/";
  let outputSizeKb = 0;
  try {
    await stat(distDir);
    outputSizeKb = await dirSizeKb(distDir);
    logger.success(`Build complete. Output: dist/ (${outputSizeKb} KB)`);
  } catch {
    logger.success("Build complete.");
  }

  return { ok: true, durationMs: Date.now() - start, outputSizeKb, outputDir, warnings };
}
