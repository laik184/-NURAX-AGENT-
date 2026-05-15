import type { DeployLogger } from "../logs/deploy-logger.ts";

export interface BundleResult {
  ok: boolean;
  outputDir: string;
  assets: string[];
  hasSourceMaps: boolean;
  error?: string;
}

export async function bundle(
  logger: DeployLogger
): Promise<BundleResult> {
  logger.info("Bundling assets for production...");
  await delay(500);

  logger.info("Generating source maps...");
  await delay(400);

  logger.info("Compressing static assets...");
  await delay(300);

  logger.info("Writing manifest.json...");
  await delay(200);

  logger.success("Bundle ready. Output: dist/");

  return {
    ok: true,
    outputDir: "dist/",
    assets: [
      "dist/index.html",
      "dist/assets/index.js",
      "dist/assets/index.css",
      "dist/assets/vendor.js",
    ],
    hasSourceMaps: true,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
