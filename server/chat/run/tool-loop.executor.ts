/**
 * tool-loop.executor.ts
 *
 * Run lifecycle executor for the tool-loop agent (default execution mode).
 *
 * Uses runAgentLoopWithContinuation so that when the agent hits max_steps,
 * it automatically compresses context and continues rather than failing
 * permanently.
 *
 * ── Memory integration (A8 + A9) ─────────────────────────────────────────────
 * BEFORE the loop:
 *   MemoryManager.loadContext() reads .nura/ files and returns a compressed
 *   context string that is injected into the LLM as memoryContext.
 *   Returns null on the very first run for a project (no-op).
 *
 * AFTER the loop:
 *   MemoryManager.saveRunSummary() writes to:
 *     .nura/run-history.jsonl  — structured run record
 *     .nura/context.md         — rolling run log
 *     .nura/architecture.md    — architecture decisions (successful runs)
 *     .nura/decisions.json     — structured decision history
 *     .nura/failures.json      — failure entries (failed runs)
 *
 *   Fire-and-forget — memory writes never block or crash the agent run.
 */

import { runAgentLoopWithContinuation } from "../../agents/core/tool-loop/index.ts";
import { ensureProjectDir }             from "../../infrastructure/sandbox/sandbox.util.ts";
import { emitAgentEvent, withRunLifecycle } from "./run-lifecycle.ts";
import { MemoryManager }                from "../../memory/index.ts";
import type { RunHandle, RunInput }     from "./types.ts";

const DEFAULT_MAX_STEPS        = 25;
const DEFAULT_MAX_CONTINUATIONS = 3;

export async function executeToolLoopRun(handle: RunHandle, input: RunInput): Promise<void> {
  const { runId, projectId } = handle;

  emitAgentEvent({
    runId,
    projectId,
    phase:     "tool-loop",
    eventType: "phase.started",
    payload:   { goal: input.goal, mode: "agent" },
    ts:        Date.now(),
  });

  return withRunLifecycle(handle, "tool-loop", async () => {
    await ensureProjectDir(projectId);

    const maxSteps = typeof input.context?.maxSteps === "number"
      ? (input.context.maxSteps as number)
      : DEFAULT_MAX_STEPS;

    const maxContinuations = typeof input.context?.maxContinuations === "number"
      ? (input.context.maxContinuations as number)
      : DEFAULT_MAX_CONTINUATIONS;

    // ── Load cross-run project memory ─────────────────────────────────────────
    const memory        = MemoryManager.for(projectId);
    const memoryContext = await memory.loadContext();

    if (memoryContext) {
      emitAgentEvent({
        runId,
        projectId,
        phase:     "tool-loop",
        eventType: "agent.thinking" as any,
        payload:   {
          text: `[memory] Project context loaded — architecture, decisions, and run history injected.`,
        },
        ts: Date.now(),
      });
    }

    // ── Execute agent loop ────────────────────────────────────────────────────
    const result = await runAgentLoopWithContinuation(
      {
        projectId,
        runId,
        goal:          input.goal,
        systemPrompt:  input.systemPrompt,
        maxSteps,
        memoryContext: memoryContext ?? undefined,
      },
      { maxContinuations },
    );

    // ── Persist run summary to .nura/ ─────────────────────────────────────────
    // Fire-and-forget — memory writes must not affect run outcome
    void memory.saveRunSummary(runId, input.goal, result);

    emitAgentEvent({
      runId,
      projectId,
      phase:     "tool-loop",
      eventType: result.success ? "phase.completed" : "phase.failed",
      payload:   {
        steps:        result.steps,
        stopReason:   result.stopReason,
        summary:      result.summary,
        error:        result.error,
        memoryLoaded: !!memoryContext,
        memoryWritten: true,
      },
      ts: Date.now(),
    });

    return {
      success: result.success,
      result:  {
        steps:      result.steps,
        stopReason: result.stopReason,
        summary:    result.summary,
        error:      result.error,
      },
    };
  });
}
