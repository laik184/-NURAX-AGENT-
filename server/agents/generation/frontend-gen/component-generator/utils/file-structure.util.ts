import type { ComponentPlan } from "../types.js";

export function buildComponentDirectory(plan: Readonly<ComponentPlan>): string {
  return `${plan.directory}/${plan.normalizedName}`;
}

export function buildFilePath(plan: Readonly<ComponentPlan>, fileName: string): string {
  return `${buildComponentDirectory(plan)}/${fileName}`;
}
