import type { DeployLogger } from "../logs/deploy-logger.ts";

export interface PromoteResult {
  ok: boolean;
  url: string;
  healthCheckPassed: boolean;
  error?: string;
}

const MAX_HEALTH_RETRIES = 3;

export async function promote(
  logger: DeployLogger,
  projectId: number,
  appName: string
): Promise<PromoteResult> {
  const slug = appName.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const url = `https://${slug}.replit.app`;

  logger.info("Pushing image to container registry...");
  await delay(700);

  logger.info("Routing traffic to new deployment...");
  await delay(500);

  let healthPassed = false;
  for (let attempt = 1; attempt <= MAX_HEALTH_RETRIES; attempt++) {
    logger.info(`Running health checks on /health... (attempt ${attempt} of ${MAX_HEALTH_RETRIES})`);
    await delay(400);

    const simulatedFail = attempt === 1 && Math.random() < 0.35;
    if (simulatedFail) {
      logger.error("Health check failed: connection refused on port 3000.");
      if (attempt < MAX_HEALTH_RETRIES) {
        logger.warn(`Retrying health check (attempt ${attempt + 1} of ${MAX_HEALTH_RETRIES})...`);
      }
    } else {
      logger.success("Health check passed. Service is healthy.");
      healthPassed = true;
      break;
    }
  }

  if (!healthPassed) {
    logger.error("All health check attempts failed. Deployment rolled back.");
    return { ok: false, url, healthCheckPassed: false, error: "Health checks failed after all retries." };
  }

  logger.success(`Deployment promoted to production. App is live 🚀`);
  logger.success(`Live URL: ${url}`);

  return { ok: true, url, healthCheckPassed: true };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
