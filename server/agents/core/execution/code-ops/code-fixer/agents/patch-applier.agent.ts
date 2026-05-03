import type { FileTree, FixPlan, PatchApplicationResult, PatchEngine, FixStep } from "../types.js";

export function applyPlans(
  codebase: FileTree,
  plans: ReadonlyArray<FixPlan>,
  patchEngine: PatchEngine,
  iteration: number,
): PatchApplicationResult {
  const nextCodebase: Record<string, string> = { ...codebase };
  const appliedFixes: FixStep[] = [];
  const failedFixes: FixStep[] = [];
  const patchResults = [];

  for (const plan of plans) {
    const originalCode = nextCodebase[plan.filePath];
    if (typeof originalCode !== "string") {
      failedFixes.push(Object.freeze({
        iteration,
        filePath: plan.filePath,
        smellKind: plan.smell.kind,
        patchType: plan.patchType,
        strategyAction: plan.strategy.action,
        status: "INVALID",
        reason: "Target file not found in codebase.",
      }));
      continue;
    }

    const patchResult = patchEngine.applyPatch({
      code: originalCode,
      patchType: plan.patchType,
      targetHint: plan.targetHint,
    });

    patchResults.push(patchResult);

    const step = Object.freeze({
      iteration,
      filePath: plan.filePath,
      smellKind: plan.smell.kind,
      patchType: plan.patchType,
      strategyAction: plan.strategy.action,
      status: patchResult.status,
      reason: patchResult.reason ?? "Applied",
    } satisfies FixStep);

    if (patchResult.status === "SUCCESS") {
      nextCodebase[plan.filePath] = patchResult.patchedCode;
      appliedFixes.push(step);
    } else {
      failedFixes.push(step);
    }
  }

  return Object.freeze({
    updatedCodebase: Object.freeze(nextCodebase),
    appliedFixes: Object.freeze(appliedFixes),
    failedFixes: Object.freeze(failedFixes),
    patchResults: Object.freeze(patchResults),
  });
}
