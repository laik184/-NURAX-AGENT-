import type { DeployLogger } from "../logs/deploy-logger.ts";

export interface BuildResult {
  ok: boolean;
  durationMs: number;
  outputSizeKb: number;
  gzippedSizeKb: number;
  warnings: string[];
  error?: string;
}

export async function build(
  logger: DeployLogger,
  projectName: string
): Promise<BuildResult> {
  const start = Date.now();

  logger.info(`Running security scan on dependencies for "${projectName}"...`);
  await delay(600);

  const hasAdvisory = Math.random() < 0.6;
  if (hasAdvisory) {
    logger.warn("lodash@4.17.20 has 1 low-severity advisory.");
  }
  logger.success("Security scan passed. No critical issues found.");

  await delay(300);
  logger.info("Installing dependencies (npm ci)...");
  await delay(800);

  logger.info("Running build script: npm run build");
  await delay(400);
  logger.info("Compiling TypeScript...");
  await delay(1000);
  logger.info("Optimizing and minifying assets...");
  await delay(700);

  const durationMs = Date.now() - start;
  const outputSizeKb = 800 + Math.floor(Math.random() * 200);
  const gzippedSizeKb = Math.floor(outputSizeKb * 0.25);

  logger.success(
    `Build completed in ${(durationMs / 1000).toFixed(1)}s  (${outputSizeKb}KB → ${gzippedSizeKb}KB gzipped)`
  );

  return {
    ok: true,
    durationMs,
    outputSizeKb,
    gzippedSizeKb,
    warnings: hasAdvisory ? ["lodash advisory: low severity"] : [],
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
