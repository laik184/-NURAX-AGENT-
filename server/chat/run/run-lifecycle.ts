/**
 * run-lifecycle.ts
 *
 * Shared lifecycle utilities for run executors.
 *
 * Eliminates boilerplate duplicated across executor.ts, tool-loop.executor.ts,
 * and planned.executor.ts:
 *   - emitAgentEvent()     — typed wrapper for bus.emit("agent.event", …)
 *   - withRunLifecycle()   — try/catch + DB status update + run.lifecycle
 *                            emission + clearCancel
 *
 * Each executor is responsible only for its own agent.event emissions and
 * calling its specific agent. This module owns everything that happens after
 * the agent returns or throws.
 */

import { eq } from "drizzle-orm";
import { db } from "../../infrastructure/db/index.ts";
import { agentRuns } from "../../../shared/schema.ts";
import { bus, type AgentEvent } from "../../infrastructure/events/bus.ts";
import { clearCancel, isCancelled } from "./registry.ts";
import type { RunHandle } from "./types.ts";

export function emitAgentEvent(event: AgentEvent): void {
  bus.emit("agent.event", event);
}

async function finalizeRun(
  handle: RunHandle,
  success: boolean,
  result: unknown
): Promise<void> {
  const { runId, projectId } = handle;
  const finalStatus = isCancelled(runId) ? "cancelled" : success ? "success" : "failed";

  await db
    .update(agentRuns)
    .set({ status: finalStatus, endedAt: new Date(), result: result as any })
    .where(eq(agentRuns.id, runId));

  handle.status = finalStatus as RunHandle["status"];
  bus.emit("run.lifecycle", {
    runId,
    projectId,
    status: finalStatus as "completed" | "failed" | "cancelled",
    ts: Date.now(),
  });
  clearCancel(runId);
}

/**
 * Wraps an executor function with the shared run lifecycle:
 *   try → run fn → finalizeRun(success)
 *   catch → emit phase.failed → finalizeRun(failed)
 *
 * The fn must:
 *   - emit its own phase.started and phase.completed/phase.failed events
 *   - return { success, result } where result is the DB-persisted payload
 */
export async function withRunLifecycle(
  handle: RunHandle,
  phase: string,
  fn: () => Promise<{ success: boolean; result: unknown }>
): Promise<void> {
  const { runId, projectId } = handle;
  try {
    const { success, result } = await fn();
    await finalizeRun(handle, success, result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    emitAgentEvent({
      runId,
      projectId,
      phase,
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
