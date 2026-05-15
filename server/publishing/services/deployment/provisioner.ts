import type { DeployLogger } from "../logs/deploy-logger.ts";

export interface ProvisionResult {
  ok: boolean;
  instanceId: string;
  region: string;
  cpu: string;
  memoryMb: number;
  error?: string;
}

const REGIONS: Record<string, string> = {
  "us-east-1":      "US East (N. Virginia)",
  "us-west-2":      "US West (Oregon)",
  "eu-west-1":      "Europe (Ireland)",
  "ap-southeast-1": "Asia Pacific (Singapore)",
};

export async function provision(
  logger: DeployLogger,
  region: string = "us-east-1"
): Promise<ProvisionResult> {
  const regionLabel = REGIONS[region] ?? region;
  logger.info("Starting deployment pipeline...");

  await delay(400);
  logger.info(`Allocating compute resources in ${regionLabel}...`);

  await delay(600);
  logger.info("Configuring networking and load balancer...");

  await delay(500);
  logger.info("Attaching persistent storage volumes...");

  await delay(400);
  logger.success("Resources provisioned successfully.");

  const instanceId = `inst-${Math.random().toString(36).slice(2, 10)}`;
  return {
    ok: true,
    instanceId,
    region,
    cpu: "0.5 vCPU",
    memoryMb: 512,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
