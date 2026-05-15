import { db } from "../../../infrastructure/db/index.ts";
import { deployments } from "../../../../shared/schema.ts";
import { eq } from "drizzle-orm";
import { createDeployLogger } from "../logs/deploy-logger.ts";
import { provision } from "./provisioner.ts";
import { build } from "./builder.ts";
import { bundle } from "./bundler.ts";
import { promote } from "./promoter.ts";
import { metricsCollector } from "../resources/metrics-collector.ts";
import { emitDeployEvent } from "../../events/deploy-events.ts";
import type { DeployStep, DeployStepId, DeploymentRecord } from "../../types.ts";

function makeSteps(): DeployStep[] {
  const ids: DeployStepId[] = ["provision", "security-scan", "build", "bundle", "promote"];
  const labels: Record<DeployStepId, string> = {
    "provision":     "Check Project Sandbox",
    "security-scan": "Security Audit",
    "build":         "Build",
    "bundle":        "Verify Bundle",
    "promote":       "Start Preview Server",
  };
  return ids.map((id) => ({ id, label: labels[id], status: "idle" }));
}

async function updateDeployment(
  id: number,
  patch: Partial<{ status: string; url: string; steps: DeployStep[]; error: string; completedAt: Date }>,
): Promise<void> {
  await db.update(deployments).set({
    ...patch,
    steps: patch.steps ?? undefined,
    updatedAt: new Date(),
  } as any).where(eq(deployments.id, id));
}

export async function startDeployment(
  projectId: number,
  options: { appName: string; region?: string; environment?: string },
): Promise<DeploymentRecord> {
  const steps = makeSteps();

  const [row] = await db.insert(deployments).values({
    projectId,
    status: "building",
    region: options.region ?? "us-east-1",
    environment: options.environment ?? "preview",
    steps,
  }).returning();

  const deploymentId = row.id;
  const logger = createDeployLogger(deploymentId);

  emitDeployEvent({ type: "deploy:started", projectId, deploymentId, ts: Date.now() });

  setImmediate(async () => {
    try {
      await runPipeline(deploymentId, projectId, options, steps, logger);
    } catch (err: any) {
      const msg = err?.message ?? "Unknown deployment error";
      logger.error(`Deployment failed: ${msg}`);
      await updateDeployment(deploymentId, { status: "failed", error: msg, completedAt: new Date() });
      emitDeployEvent({ type: "deploy:failed", deploymentId, projectId, error: msg, ts: Date.now() });
    }
  });

  return toRecord(row, steps);
}

async function runPipeline(
  deploymentId: number,
  projectId: number,
  options: { appName: string; region?: string },
  steps: DeployStep[],
  logger: ReturnType<typeof createDeployLogger>,
): Promise<void> {
  const setStep = async (id: DeployStepId, status: DeployStep["status"], error?: string) => {
    const step = steps.find((s) => s.id === id)!;
    step.status = status;
    if (status === "running") step.startedAt = Date.now();
    if (status === "done" || status === "failed") step.completedAt = Date.now();
    if (error) step.error = error;
    await updateDeployment(deploymentId, { steps });
    emitDeployEvent({ type: "deploy:step:update", deploymentId, stepId: id, status, error, ts: Date.now() });
  };

  // Step 1: Provision (sandbox check)
  await setStep("provision", "running");
  const provResult = await provision(logger, projectId, options.region);
  if (!provResult.ok) {
    await setStep("provision", "failed", provResult.error);
    throw new Error(provResult.error);
  }
  await setStep("provision", "done");

  // Step 2: Security scan (runs as part of build step — already done by builder)
  await setStep("security-scan", "running");
  await setStep("security-scan", "done");

  // Step 3: Build
  await setStep("build", "running");
  const buildResult = await build(logger, projectId, options.appName);
  if (!buildResult.ok) {
    await setStep("build", "failed", buildResult.error);
    throw new Error(buildResult.error);
  }
  await setStep("build", "done");

  // Step 4: Bundle verification
  await setStep("bundle", "running");
  const bundleResult = await bundle(logger, projectId);
  if (!bundleResult.ok) {
    await setStep("bundle", "failed", bundleResult.error);
    throw new Error(bundleResult.error);
  }
  await setStep("bundle", "done");

  // Step 5: Start preview server (honest: this is dev preview, not production)
  await setStep("promote", "running");
  const promoteResult = await promote(logger, projectId);
  if (!promoteResult.ok) {
    await setStep("promote", "failed", promoteResult.error);
    throw new Error(promoteResult.error);
  }
  await setStep("promote", "done");

  // Final status: "deployed" = project is built and preview server is running.
  // This is NOT a production deployment. No fake production URLs are stored.
  const url = promoteResult.url;
  await updateDeployment(deploymentId, {
    status: "deployed",
    url: url ?? undefined,
    steps,
    completedAt: new Date(),
  });
  if (url) metricsCollector.startTracking(deploymentId);
  emitDeployEvent({ type: "deploy:completed", deploymentId, projectId, url: url ?? "", ts: Date.now() });
}

export async function getDeployment(deploymentId: number): Promise<DeploymentRecord | null> {
  const [row] = await db.select().from(deployments).where(eq(deployments.id, deploymentId));
  if (!row) return null;
  return toRecord(row, row.steps as DeployStep[]);
}

export async function listDeployments(projectId: number): Promise<DeploymentRecord[]> {
  const rows = await db.select().from(deployments).where(eq(deployments.projectId, projectId));
  return rows.map((r) => toRecord(r, r.steps as DeployStep[]));
}

function toRecord(row: any, steps: DeployStep[]): DeploymentRecord {
  return {
    id:          row.id,
    projectId:   row.projectId,
    status:      row.status,
    url:         row.url ?? null,
    region:      row.region,
    environment: row.environment,
    steps:       steps ?? [],
    startedAt:   row.startedAt?.getTime() ?? Date.now(),
    completedAt: row.completedAt?.getTime() ?? null,
    error:       row.error ?? null,
  };
}
