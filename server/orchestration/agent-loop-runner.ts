import { eq } from "drizzle-orm";
import { runAgentLoop } from "./agent-loop.ts";
import { db } from "../infrastructure/db/index.ts";
import { agentRuns } from "../../shared/schema.ts";
import { bus, type AgentEvent } from "../infrastructure/events/bus.ts";
import { ensureProjectDir } from "../infrastructure/sandbox/sandbox.util.ts";
import { clearCancel, isCancelled } from "./runs.ts";
import type { RunHandle, RunInput } from "./types.ts";

function emit(event: AgentEvent): void {
  bus.emit("agent.event", event);
}

export async function executeToolLoopRun(handle: RunHandle, input: RunInput): Promise<void> {
  const { runId, projectId } = handle;
  try {
    emit({
      runId,
      projectId,
      phase: "tool-loop",
      eventType: "phase.started",
      payload: { goal: input.goal, mode: "agent" },
      ts: Date.now(),
    });

    await ensureProjectDir(projectId);

    const result = await runAgentLoop({
      projectId,
      runId,
      goal: input.goal,
      systemPrompt: input.systemPrompt,
      maxSteps:
        typeof input.context?.maxSteps === "number"
          ? (input.context!.maxSteps as number)
          : 25,
    });

    const finalStatus = isCancelled(runId)
      ? "cancelled"
      : result.success
      ? "success"
      : "failed";

    emit({
      runId,
      projectId,
      phase: "tool-loop",
      eventType: result.success ? "phase.completed" : "phase.failed",
      payload: {
        steps: result.steps,
        stopReason: result.stopReason,
        summary: result.summary,
        error: result.error,
      },
      ts: Date.now(),
    });

    await db
      .update(agentRuns)
      .set({
        status: finalStatus,
        endedAt: new Date(),
        result: {
          steps: result.steps,
          stopReason: result.stopReason,
          summary: result.summary,
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
      phase: "tool-loop",
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
