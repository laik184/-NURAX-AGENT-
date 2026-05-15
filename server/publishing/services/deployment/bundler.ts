import { stat, readdir } from "fs/promises";
import * as path from "path";
import { getProjectDir } from "../../../infrastructure/sandbox/sandbox.util.ts";
import type { DeployLogger } from "../logs/deploy-logger.ts";

export interface BundleResult {
  ok: boolean;
  outputDir: string;
  assets: string[];
  totalSizeKb: number;
  error?: string;
}

async function listAssets(dir: string, base: string): Promise<string[]> {
  const result: string[] = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const rel = path.join(base, entry.name);
      if (entry.isDirectory()) {
        result.push(...(await listAssets(path.join(dir, entry.name), rel)));
      } else {
        result.push(rel);
      }
    }
  } catch { /* skip */ }
  return result;
}

async function dirSizeKb(dir: string): Promise<number> {
  let total = 0;
  const assets = await listAssets(dir, "");
  for (const rel of assets) {
    try {
      const s = await stat(path.join(dir, rel));
      total += s.size;
    } catch { /* skip */ }
  }
  return Math.round(total / 1024);
}

export async function bundle(
  logger: DeployLogger,
  projectId: number,
): Promise<BundleResult> {
  const projectDir = getProjectDir(projectId);
  const distDir = path.join(projectDir, "dist");

  logger.info("Inspecting build output...");

  try {
    await stat(distDir);
  } catch {
    const msg = "Build output directory dist/ not found. Build step may have failed.";
    logger.error(msg);
    return { ok: false, outputDir: "dist/", assets: [], totalSizeKb: 0, error: msg };
  }

  const assets = await listAssets(distDir, "dist/");
  const totalSizeKb = await dirSizeKb(distDir);

  if (assets.length === 0) {
    const msg = "dist/ directory is empty — build produced no output.";
    logger.error(msg);
    return { ok: false, outputDir: "dist/", assets: [], totalSizeKb: 0, error: msg };
  }

  logger.success(`Bundle verified: ${assets.length} file(s), ${totalSizeKb} KB total.`);
  return { ok: true, outputDir: "dist/", assets, totalSizeKb };
}
