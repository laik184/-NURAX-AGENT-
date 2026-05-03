import { sequenceDependencies } from "./agents/dependency-sequencer.agent.js";
import { planFixStrategies } from "./agents/fix-planner.agent.js";
import { buildPlanSteps } from "./agents/step-builder.agent.js";
import { toFinalOutput } from "./state.js";
import type { FinalStrategyOutput, Issue, PriorityResult } from "./types.js";

export function runStrategyEngine(
  issues: readonly Issue[],
  priorityResult: PriorityResult,
): FinalStrategyOutput {
  if (issues.length === 0) {
    return toFinalOutput(Object.freeze([]));
  }

  const strategies     = planFixStrategies(issues, priorityResult);
  const builtPlans     = buildPlanSteps(strategies);
  const sequencedPlans = sequenceDependencies(builtPlans);

  return toFinalOutput(sequencedPlans);
}
