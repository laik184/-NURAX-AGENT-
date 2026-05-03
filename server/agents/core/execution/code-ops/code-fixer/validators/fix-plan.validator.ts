import type { FixPlan } from "../types.js";
import { CodeFixerError } from "../utils/error.util.js";

export function validateFixPlans(plans: ReadonlyArray<FixPlan>): void {
  const seen = new Set<string>();

  for (const plan of plans) {
    if (!plan.filePath || !plan.smell || !plan.patchType) {
      throw new CodeFixerError("ERR_INVALID_FIX_PLAN", "Every plan needs filePath, smell and patchType.");
    }

    const key = `${plan.filePath}:${plan.smell.kind}:${plan.patchType}`;
    if (seen.has(key)) {
      throw new CodeFixerError("ERR_DUPLICATE_FIX_PLAN", `Duplicate fix plan detected for ${key}.`);
    }

    seen.add(key);
  }
}
