/**
 * tool-loop.executor.ts
 *
 * Run lifecycle executor for the tool-loop agent (default execution mode).
 *
 * Uses runAgentLoopWithContinuation so that when the agent hits max_steps,
 * it automatically compresses context and continues rather than failing
 * permanently.  The continuation manager handles all retry/event logic;
 * this file owns only the run lifecycle (sandbox setup, DB, SSE lifecycle).
 */

import { runAgentLoopWithContinuation } from "../../agents/core/tool-loop/index.ts";
import { ensureProjectDir } from "../../infrastructure/sandbox/sandbox.util.ts";
import { emitAgentEvent, withRunLifecycle } from "./run-lifecycle.ts";
import type { RunHandle, RunInput } from "./types.ts";

const DEFAULT_MAX_STEPS = 25;
const DEFAULT_MAX_CONTINUATIONS = 3;

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

    const maxSteps =
      typeof input.context?.maxSteps === "number"
        ? (input.context.maxSteps as number)
        : DEFAULT_MAX_STEPS;

    const maxContinuations =
      typeof input.context?.maxContinuations === "number"
        ? (input.context.maxContinuations as number)
        : DEFAULT_MAX_CONTINUATIONS;

    const result = await runAgentLoopWithContinuation(
      {
        projectId,
        runId,
        goal: input.goal,
        systemPrompt: input.systemPrompt,
        maxSteps,
      },
      { maxContinuations }
    );

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
