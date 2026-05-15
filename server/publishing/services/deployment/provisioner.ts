import { stat } from "fs/promises";
import * as path from "path";
import { getProjectDir } from "../../../infrastructure/sandbox/sandbox.util.ts";
import type { DeployLogger } from "../logs/deploy-logger.ts";

export interface ProvisionResult {
  ok: boolean;
  projectDir: string;
  hasPackageJson: boolean;
  hasDependencies: boolean;
  error?: string;
}

export async function provision(
  logger: DeployLogger,
  projectId: number,
  _region?: string,
): Promise<ProvisionResult> {
  const projectDir = getProjectDir(projectId);
  logger.info("Checking project sandbox...");

  let dirExists = false;
  try {
    await stat(projectDir);
    dirExists = true;
  } catch {
    const msg = `Project sandbox directory not found: ${projectDir}`;
    logger.error(msg);
    return { ok: false, projectDir, hasPackageJson: false, hasDependencies: false, error: msg };
  }

  let hasPackageJson = false;
  try {
    await stat(path.join(projectDir, "package.json"));
    hasPackageJson = true;
    logger.info("Found package.json.");
  } catch {
    const msg = "No package.json found in project directory — cannot build.";
    logger.error(msg);
    return { ok: false, projectDir, hasPackageJson: false, hasDependencies: false, error: msg };
  }

  let hasDependencies = false;
  try {
    await stat(path.join(projectDir, "node_modules"));
    hasDependencies = true;
    logger.info("Dependencies directory found.");
  } catch {
    logger.warn("node_modules not found. Run npm install before deploying.");
  }

  if (!hasDependencies) {
    const msg = "Dependencies not installed. Run npm install or npm ci first.";
    logger.error(msg);
    return { ok: false, projectDir, hasPackageJson, hasDependencies: false, error: msg };
  }

  logger.success("Project sandbox ready.");
  return { ok: true, projectDir, hasPackageJson, hasDependencies };
}
