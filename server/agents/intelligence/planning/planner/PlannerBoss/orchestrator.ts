import type {
  UserGoal,
  ExecutionPlan,
  PlannerResult,
  PlanningPhase,
} from "./types.ts";
import * as state from "./state.ts";
import { refinePrompt }     from "./agents/prompt-refinement.agent.ts";
import { mapCapabilities }  from "./agents/capability-router.agent.ts";
import { analyzeGoal }      from "./agents/goal-analyzer.agent.ts";
import { decomposeTasks }   from "./agents/task-decomposer.agent.ts";
import { planDependencies } from "./agents/dependency-planner.agent.ts";
import { buildStrategy }    from "./agents/execution-strategy.agent.ts";
import { assessRisk }       from "./agents/risk-assessment.agent.ts";
import { validatePlan }     from "./agents/plan-validator.agent.ts";

let _planCounter = 0;

function makePlanId(): string {
  _planCounter += 1;
  return `plan-${Date.now()}-${String(_planCounter).padStart(4, "0")}`;
}

function makeSessionId(goal: UserGoal): string {
  return goal.sessionId ?? `session-${Date.now()}`;
}

function fail(
  error:   string,
  code:    string,
  phase:   PlanningPhase,
): PlannerResult<ExecutionPlan> {
  state.setPhase("failed");
  return Object.freeze({ ok: false, error, code, phase });
}

export function plan(goal: UserGoal): PlannerResult<ExecutionPlan> {

  if (!goal.rawInput || goal.rawInput.trim().length === 0) {
    return fail("rawInput must be a non-empty string.", "ERR_EMPTY_INPUT", "idle");
  }

  const sessionId = makeSessionId(goal);
  state.initSession(goal, sessionId);

  // ── Phase 1: Prompt Refinement ──────────────────────────────────────────────
  state.setPhase("prompt-refinement");
  const refinedPrompt = refinePrompt(goal);
  state.setRefinedPrompt(refinedPrompt);

  if (refinedPrompt.normalized.length === 0) {
    return fail("Prompt normalization produced empty output.", "ERR_EMPTY_PROMPT", "prompt-refinement");
  }

  // ── Phase 2: Goal Analysis ──────────────────────────────────────────────────
  state.setPhase("goal-analysis");
  const intent = analyzeGoal(refinedPrompt);
  state.setIntent(intent);

  if (intent.primaryObjective.length === 0) {
    return fail("Goal analysis failed to extract a primary objective.", "ERR_NO_OBJECTIVE", "goal-analysis");
  }

  // ── Phase 3: Capability Routing ─────────────────────────────────────────────
  const capabilityMap = mapCapabilities(intent);
  state.setCapabilityMap(capabilityMap);

  // ── Phase 4: Task Decomposition ─────────────────────────────────────────────
  state.setPhase("task-decomposition");
  const tasks = decomposeTasks(intent);
  state.setTasks(tasks);

  if (tasks.length === 0) {
    return fail("Task decomposition produced zero tasks.", "ERR_NO_TASKS", "task-decomposition");
  }

  // ── Phase 5: Dependency Planning ────────────────────────────────────────────
  state.setPhase("dependency-planning");
  const dependencyMap = planDependencies(tasks);
  state.setDependencyMap(dependencyMap);

  if (dependencyMap.hasCircularDeps) {
    return fail(
      "Circular dependency detected in task graph. Plan cannot be safely executed.",
      "ERR_CIRCULAR_DEPS",
      "dependency-planning",
    );
  }

  // ── Phase 6: Execution Strategy ─────────────────────────────────────────────
  state.setPhase("strategy-building");
  const strategy = buildStrategy(dependencyMap);
  state.setStrategy(strategy);

  // ── Phase 7: Risk Assessment ─────────────────────────────────────────────────
  state.setPhase("risk-assessment");
  const riskAssessment = assessRisk(strategy);
  state.setRiskAssessment(riskAssessment);

  // ── Phase 8: Plan Validation ─────────────────────────────────────────────────
  state.setPhase("validation");
  const validationReport = validatePlan(strategy, riskAssessment);
  state.setValidationReport(validationReport);

  if (!validationReport.valid) {
    return fail(
      `Plan validation failed. ${validationReport.summary}`,
      "ERR_INVALID_PLAN",
      "validation",
    );
  }

  // ── Phase 9: Freeze and Return ───────────────────────────────────────────────
  state.setPhase("complete");

  const executionPlan = Object.freeze<ExecutionPlan>({
    planId:           makePlanId(),
    sessionId,
    createdAt:        Date.now(),
    goal:             Object.freeze(goal),
    refinedPrompt,
    intent,
    capabilityMap,
    tasks:            Object.freeze([...tasks]),
    dependencyMap,
    strategy,
    riskAssessment,
    validationReport,
    approved:         riskAssessment.approved && validationReport.valid,
  });

  return Object.freeze<PlannerResult<ExecutionPlan>>({
    ok:    true,
    data:  executionPlan,
    phase: "complete",
  });
}

export function getActiveSession() {
  return state.getSession();
}

export function resetPlanner(): void {
  state.clearSession();
}
