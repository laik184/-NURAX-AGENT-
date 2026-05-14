/**
 * tool-loop.executor.ts
 *
 * Run lifecycle executor for the tool-loop agent (default execution mode).
 *
 * This is NOT an agent — it is the run manager that:
 *   1. Ensures the sandbox directory exists
 *   2. Calls the real agent (server/agents/core/tool-loop/)
 *   3. Emits agent.event phase events on the bus
 *   4. Delegates DB updates + run.lifecycle emission to withRunLifecycle
 */

import { runAgentLoop } from "../../agents/core/tool-loop/index.ts";
import { ensureProjectDir } from "../../infrastructure/sandbox/sandbox.util.ts";
import { emitAgentEvent, withRunLifecycle } from "./run-lifecycle.ts";
import type { RunHandle, RunInput } from "./types.ts";

export async function executeToolLoopRun(handle: RunHandle, input: RunInput): Promise<void> {
  const { runId, projectId } = handle;

  emitAgentEvent({
    runId,
    projectId,
    phase: "tool-loop",
    eventType: "phase.started",
    payload: { goal: input.goal, mode: "agent" },
    ts: Date.now(),
  });

  return withRunLifecycle(handle, "tool-loop", async () => {
    await ensureProjectDir(projectId);

    const result = await runAgentLoop({
      projectId,
      runId,
      goal: input.goal,
      systemPrompt: input.systemPrompt,
      maxSteps:
        typeof input.context?.maxSteps === "number"
          ? (input.context.maxSteps as number)
          : 25,
    });

    emitAgentEvent({
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

    return {
      success: result.success,
      result: {
        steps: result.steps,
        stopReason: result.stopReason,
        summary: result.summary,
        error: result.error,
      },
    };
  });
}
