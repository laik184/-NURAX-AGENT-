/**
 * planner.memory.ts
 *
 * Persists execution plans and phase results to the sandbox directory.
 * Enables recovery, auditing, and future checkpoint support.
 */

import fs from "fs/promises";
import path from "path";
import type { ExecutionPlan, PhaseResult } from "./planner.types.ts";

const SANDBOX_ROOT = process.env.AGENT_PROJECT_ROOT || ".sandbox";

function planDir(projectId: number, runId: string): string {
  return path.join(SANDBOX_ROOT, String(projectId), ".nura", "plans", runId);
}

export async function savePlan(plan: ExecutionPlan): Promise<void> {
  const dir = planDir(plan.projectId, plan.runId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, "plan.json"),
    JSON.stringify(plan, null, 2),
    "utf8"
  );
}

export async function savePhaseResult(
  projectId: number,
  runId: string,
  result: PhaseResult
): Promise<void> {
  const dir = planDir(projectId, runId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, `${result.phaseId}.result.json`),
    JSON.stringify(result, null, 2),
    "utf8"
  );
}

export async function loadPlan(
  projectId: number,
  runId: string
): Promise<ExecutionPlan | null> {
  const file = path.join(planDir(projectId, runId), "plan.json");
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as ExecutionPlan;
  } catch {
    return null;
  }
}

export async function listPlans(projectId: number): Promise<string[]> {
  const base = path.join(SANDBOX_ROOT, String(projectId), ".nura", "plans");
  try {
    const entries = await fs.readdir(base);
    return entries;
  } catch {
    return [];
  }
}
