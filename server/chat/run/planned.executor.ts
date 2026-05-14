/**
 * planned.executor.ts
 *
 * Run lifecycle executor for the Planner Agent.
 * Mirrors tool-loop.executor.ts structure but routes complex goals
 * through the Planner Agent before execution.
 *
 * Responsibilities:
 *  1. Emit run lifecycle events
 *  2. Ensure sandbox directory exists
 *  3. Run Planner Agent (plan → phase execution)
 *  4. Update DB with final status and result
 */

import { eq } from "drizzle-orm";
import { runPlannerAgent } from "../../agents/planning/index.ts";
import { db } from "../../infrastructure/db/index.ts";
import { agentRuns } from "../../../shared/schema.ts";
import { bus, type AgentEvent } from "../../infrastructure/events/bus.ts";
import { ensureProjectDir } from "../../infrastructure/sandbox/sandbox.util.ts";
import { clearCancel, isCancelled } from "./registry.ts";
import type { RunHandle, RunInput } from "./types.ts";

function emit(event: AgentEvent): void {
  bus.emit("agent.event", event);
}

export async function executePlannedRun(
  handle: RunHandle,
  input: RunInput
): Promise<void> {
  const { runId, projectId } = handle;

  try {
    emit({
      runId,
      projectId,
      phase: "planner",
      eventType: "phase.started",
      payload: { goal: input.goal, mode: "planned" },
      ts: Date.now(),
    });

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

    const finalStatus = isCancelled(runId)
      ? "cancelled"
      : result.overallSuccess
      ? "success"
      : "failed";

    emit({
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

    await db
      .update(agentRuns)
      .set({
        status: finalStatus,
        endedAt: new Date(),
        result: {
          planned: true,
          phases: result.plan.phases.length,
          totalSteps: result.totalSteps,
          durationMs: result.durationMs,
          overallSuccess: result.overallSuccess,
          phaseResults: result.phaseResults,
        } as any,
      })
      .where(eq(agentRuns.id, runId));

    handle.status = finalStatus as RunHandle["status"];
    bus.emit("run.lifecycle", {
      runId,
      projectId,
      status: finalStatus as "completed" | "failed" | "cancelled",
      ts: Date.now(),
    });
    clearCancel(runId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    emit({
      runId,
      projectId,
      phase: "planner",
      eventType: "phase.failed",
      payload: { error: message },
      ts: Date.now(),
    });
    await db
      .update(agentRuns)
      .set({ status: "failed", endedAt: new Date(), result: { error: message } as any })
      .where(eq(agentRuns.id, runId));
    handle.status = "failed";
    bus.emit("run.lifecycle", { runId, projectId, status: "failed", ts: Date.now() });
  }
}
