/**
 * executor.ts
 *
 * Run lifecycle executor for the 9-phase pipeline agent.
 * Invoked only when mode="pipeline" is explicitly set on RunInput.
 *
 * The pipeline is a static rule-based orchestration engine (safety → routing →
 * decision → planning → validation → generation dispatch → execution →
 * recovery → feedback → memory). It does NOT call the LLM directly.
 *
 * For real-time LLM tool-calling use tool-loop.executor.ts (mode="agent")
 * or planned.executor.ts (mode="planned").
 */

import { executePipeline } from "../../agents/core/pipeline/index.ts";
import { ensureProjectDir } from "../../infrastructure/sandbox/sandbox.util.ts";
import { extractCodeFiles, writeFiles } from "./code-files.ts";
import { isCancelled } from "./registry.ts";
import { emitAgentEvent, withRunLifecycle } from "./run-lifecycle.ts";
import type { RunHandle, RunInput } from "./types.ts";

export async function executePipelineRun(handle: RunHandle, input: RunInput): Promise<void> {
  const { runId, projectId } = handle;

  emitAgentEvent({
    runId,
    projectId,
    phase: "routing",
    eventType: "phase.started",
    payload: { goal: input.goal, mode: input.mode || "core" },
    ts: Date.now(),
  });

  return withRunLifecycle(handle, "routing", async () => {
    await ensureProjectDir(projectId);

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
      emitAgentEvent({
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

    return {
      success: result.success,
      result: {
        finalPhase: result.finalPhase,
        totalDurationMs: result.totalDurationMs,
        error: result.error,
      },
    };
  });
}
