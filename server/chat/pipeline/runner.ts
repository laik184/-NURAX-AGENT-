import { eq } from "drizzle-orm";
import { executePipeline } from "../../agents/core/pipeline/index.ts";
import { db } from "../../infrastructure/db/index.ts";
import { agentRuns } from "../../../shared/schema.ts";
import { bus, type AgentEvent } from "../../infrastructure/events/bus.ts";
import { extractCodeFiles, writeFiles } from "./code-files.ts";
import { clearCancel, isCancelled } from "./runs.ts";
import type { RunHandle, RunInput } from "./types.ts";

function emit(event: AgentEvent): void {
  bus.emit("agent.event", event);
}

export async function executePipelineRun(handle: RunHandle, input: RunInput): Promise<void> {
  const { runId, projectId } = handle;
  try {
    emit({
      runId,
      projectId,
      phase: "routing",
      eventType: "phase.started",
      payload: { goal: input.goal, mode: input.mode || "core" },
      ts: Date.now(),
    });

    const result = await executePipeline({
      requestId: runId,
      input: input.goal,
      sessionId: `project-${projectId}`,
      context: { ...(input.context || {}), projectId, mode: input.mode },
      allowDestructive: false,
      maxFeedbackAttempts: 3,
    });

    for (const phase of result.phases) {
      if (isCancelled(runId)) break;
      emit({
        runId,
        projectId,
        phase: phase.phase,
        eventType: phase.success ? "phase.completed" : "phase.failed",
        payload: {
          durationMs: phase.durationMs,
          error: phase.error,
          data: phase.data,
        },
        ts: Date.now(),
      });

      const files = extractCodeFiles(phase.data);
      if (files.length > 0) {
        await writeFiles(projectId, files, runId);
      }
    }

    const finalStatus = isCancelled(runId)
      ? "cancelled"
      : result.success
      ? "success"
      : "failed";

    await db
      .update(agentRuns)
      .set({
        status: finalStatus,
        endedAt: new Date(),
        result: {
          finalPhase: result.finalPhase,
          totalDurationMs: result.totalDurationMs,
          error: result.error,
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
