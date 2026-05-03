import type { JobConfig, RunnerOs, StepConfig } from "../types.js";

export function buildCiJob(
  steps: readonly StepConfig[],
  runsOn: RunnerOs = "ubuntu-latest",
): JobConfig {
  return Object.freeze({
    id: "ci",
    name: "CI — Install, Lint, Test, Build",
    runsOn,
    timeoutMinutes: 30,
    steps,
  });
}

export function buildDeployStagingJob(
  steps: readonly StepConfig[],
  runsOn: RunnerOs = "ubuntu-latest",
): JobConfig {
  return Object.freeze({
    id: "deploy-staging",
    name: "Deploy — Staging",
    runsOn,
    needs: ["ci"],
    if: "github.ref == 'refs/heads/develop'",
    timeoutMinutes: 15,
    steps,
  });
}

export function buildDeployProductionJob(
  steps: readonly StepConfig[],
  runsOn: RunnerOs = "ubuntu-latest",
): JobConfig {
  return Object.freeze({
    id: "deploy-production",
    name: "Deploy — Production",
    runsOn,
    needs: ["ci"],
    if: "github.ref == 'refs/heads/main' || github.ref == 'refs/heads/master'",
    timeoutMinutes: 15,
    steps,
  });
}

export function buildNotifyJob(
  runsOn: RunnerOs = "ubuntu-latest",
  dependsOn: readonly string[] = ["ci"],
): JobConfig {
  return Object.freeze({
    id: "notify",
    name: "Notify on failure",
    runsOn,
    needs: dependsOn as string[],
    if: "failure()",
    timeoutMinutes: 5,
    steps: Object.freeze([
      Object.freeze({
        name: "Notify team",
        run: 'echo "Workflow failed on ${{ github.ref }} — ${{ github.actor }}"',
      }),
    ]),
  });
}
