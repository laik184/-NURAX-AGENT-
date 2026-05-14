/**
 * server/agents/planning
 *
 * Planner Agent — decomposes large user goals into ordered execution phases
 * before handing each phase to the tool-loop agent.
 *
 * Public API:
 *   runPlannerAgent(input)  — generate plan + execute all phases
 *   needsPlanning(goal)     — heuristic: should this goal be planned?
 */

export { runPlannerAgent, needsPlanning } from "./planner.agent.ts";
export type {
  PlannerInput,
  PlannerResult,
  ExecutionPlan,
  ExecutionPhase,
  PhaseResult,
} from "./planner.types.ts";
