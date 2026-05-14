/**
 * planned.executor.ts
 *
 * Run lifecycle executor for the Planner Agent.
 *
 * Routes complex goals through the Planner Agent before execution:
 *   1. LLM decomposes the goal into ordered phases
 *   2. Each phase is executed sequentially via the tool-loop agent
 *
 * Ensures sandbox directory exists, emits agent.event phase events,
 * and delegates DB updates + run.lifecycle emission to withRunLifecycle.
 */

import { runPlannerAgent } from "../../agents/planning/index.ts";
import { ensureProjectDir } from "../../infrastructure/sandbox/sandbox.util.ts";
import { emitAgentEvent, withRunLifecycle } from "./run-lifecycle.ts";
import type { RunHandle, RunInput } from "./types.ts";

export async function executePlannedRun(handle: RunHandle, input: RunInput): Promise<void> {
  const { runId, projectId } = handle;

  emitAgentEvent({
    runId,
    projectId,
    phase: "planner",
    eventType: "phase.started",
    payload: { goal: input.goal, mode: "planned" },
    ts: Date.now(),
  });

  return withRunLifecycle(handle, "planner", async () => {
    await ensureProjectDir(projectId);

    const result = await runPlannerAgent({
      projectId,
      runId,
      goal: input.goal,
      systemPrompt: input.systemPrompt,
      maxStepsPerPhase:
        typeof input.context?.maxStepsPerPhase === "number"
          ? (input.context.maxStepsPerPhase as number)
          : 20,
    });

    emitAgentEvent({
      runId,
      projectId,
      phase: "planner",
      eventType: result.overallSuccess ? "phase.completed" : "phase.failed",
      payload: {
        phases: result.plan.phases.length,
        totalSteps: result.totalSteps,
        durationMs: result.durationMs,
        phaseResults: result.phaseResults.map((r) => ({
          phaseId: r.phaseId,
          success: r.success,
          steps: r.steps,
          summary: r.summary.slice(0, 300),
        })),
      },
      ts: Date.now(),
    });

    return {
      success: result.overallSuccess,
      result: {
        planned: true,
        phases: result.plan.phases.length,
        totalSteps: result.totalSteps,
        durationMs: result.durationMs,
        overallSuccess: result.overallSuccess,
        phaseResults: result.phaseResults,
      },
    };
  });
}
