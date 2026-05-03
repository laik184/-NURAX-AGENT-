import type {
  GoalInput,
  ExecutionPlan,
  PlanResult,
  PlanningStage,
} from "./types.js";
import * as state              from "./state.js";
import { analyzeGoal }         from "./agents/goal-analyzer.agent.js";
import { decomposeTasks }      from "./agents/task-decomposer.agent.js";
import { mapDependencies }     from "./agents/dependency-mapper.agent.js";
import { sequenceExecution }   from "./agents/execution-sequencer.agent.js";
import { computeTotalEffort }  from "./utils/order.resolver.util.js";

let _planCounter = 0;

function makePlanId(): string {
  _planCounter += 1;
  return `cp-plan-${Date.now()}-${String(_planCounter).padStart(4, "0")}`;
}

function makeSessionId(goal: GoalInput): string {
  return goal.sessionId ?? `cp-session-${Date.now()}`;
}

function fail(
  error: string,
  code:  string,
  stage: PlanningStage,
): PlanResult<ExecutionPlan> {
  state.setStage("failed");
  return Object.freeze({ ok: false, error, code, stage });
}

function validateInput(goal: GoalInput): string | null {
  if (!goal.goalId || goal.goalId.trim().length === 0)
    return "goalId must be a non-empty string.";
  if (!goal.primaryObjective || goal.primaryObjective.trim().length === 0)
    return "primaryObjective must be a non-empty string.";
  if (goal.estimatedComplexity < 0 || goal.estimatedComplexity > 1)
    return "estimatedComplexity must be between 0 and 1.";
  return null;
}

export function createPlan(goal: GoalInput): PlanResult<ExecutionPlan> {

  const validationError = validateInput(goal);
  if (validationError !== null) {
    return fail(validationError, "ERR_INVALID_INPUT", "idle");
  }

  const sessionId = makeSessionId(goal);
  state.initSession(goal, sessionId);

  // ── Phase 1: Goal Analysis ──────────────────────────────────────────────────
  state.setStage("goal-analysis");
  const analyzedGoal = analyzeGoal(goal);
  state.setAnalyzedGoal(analyzedGoal);

  if (analyzedGoal.taskCategories.length === 0) {
    return fail(
      "Goal analysis produced no task categories.",
      "ERR_NO_CATEGORIES",
      "goal-analysis",
    );
  }

  // ── Phase 2: Task Decomposition ─────────────────────────────────────────────
  state.setStage("task-decomposition");
  const tasks = decomposeTasks(analyzedGoal);
  state.setTaskGraph({ nodes: tasks, edges: [] });

  if (tasks.length === 0) {
    return fail(
      "Task decomposition produced zero tasks.",
      "ERR_NO_TASKS",
      "task-decomposition",
    );
  }

  // ── Phase 3: Dependency Mapping ─────────────────────────────────────────────
  state.setStage("dependency-mapping");
  const taskGraph = mapDependencies(tasks);
  state.setTaskGraph({ nodes: taskGraph.nodes, edges: taskGraph.edges });

  if (taskGraph.hasCircularDeps) {
    return fail(
      "Circular dependency detected in task graph. Cannot produce safe execution order.",
      "ERR_CIRCULAR_DEPS",
      "dependency-mapping",
    );
  }

  // ── Phase 4: Execution Sequencing ───────────────────────────────────────────
  state.setStage("execution-sequencing");
  const executionLevels = sequenceExecution(taskGraph);
  state.setExecutionLevels(executionLevels);

  if (executionLevels.length === 0) {
    return fail(
      "Execution sequencer produced no execution levels.",
      "ERR_NO_LEVELS",
      "execution-sequencing",
    );
  }

  // ── Phase 5: Assemble and Freeze ────────────────────────────────────────────
  state.setStage("complete");

  const estimatedEffort = computeTotalEffort(tasks, executionLevels);
  const parallelizable  = executionLevels.some(l => l.canParallelize);

  const executionPlan = Object.freeze<ExecutionPlan>({
    planId:          makePlanId(),
    sessionId,
    createdAt:       Date.now(),
    goal:            Object.freeze(goal),
    taskGraph:       Object.freeze(taskGraph),
    executionLevels: Object.freeze([...executionLevels]),
    totalTasks:      tasks.length,
    estimatedEffort,
    parallelizable,
  });

  return Object.freeze<PlanResult<ExecutionPlan>>({
    ok:    true,
    data:  executionPlan,
    stage: "complete",
  });
}

export function getSession() {
  return state.getSession();
}

export function resetOrchestrator(): void {
  state.clearSession();
}
