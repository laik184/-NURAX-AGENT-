/**
 * tool-loop.executor.ts
 *
 * Run lifecycle executor for the tool-loop agent (default execution mode).
 *
 * Uses runAgentLoopWithContinuation so that when the agent hits max_steps,
 * it automatically compresses context and continues rather than failing
 * permanently.  The continuation manager handles all retry/event logic;
 * this file owns only the run lifecycle (sandbox setup, DB, SSE lifecycle).
 *
 * ── Memory integration ────────────────────────────────────────────────────────
 * Before the loop starts:
 *   - buildProjectContext() reads .nura/ files from the project sandbox
 *   - If memory exists, injects it as memoryContext into AgentLoopInput
 *
 * After the loop ends:
 *   - summarizeAndPersist() extracts a structured RunSummary and writes to
 *     .nura/run-history.jsonl, .nura/context.md, .nura/failures.json
 */

import { runAgentLoopWithContinuation } from "../../agents/core/tool-loop/index.ts";
import { ensureProjectDir }             from "../../infrastructure/sandbox/sandbox.util.ts";
import { emitAgentEvent, withRunLifecycle } from "./run-lifecycle.ts";
import { buildProjectContext, summarizeAndPersist } from "../../memory/index.ts";
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

    // ── Load cross-run project memory ────────────────────────────────────────
    // Returns null on the very first run for this project (no .nura/ yet)
    const memoryContext = await buildProjectContext(projectId);

    if (memoryContext) {
      emitAgentEvent({
        runId,
        projectId,
        phase:     "tool-loop",
        eventType: "agent.thinking" as any,
        payload:   { text: "[memory] Loaded project context — injecting cross-run memory." },
        ts:        Date.now(),
      });
    }

    // ── Execute agent loop ───────────────────────────────────────────────────
    const result = await runAgentLoopWithContinuation(
      {
        projectId,
        runId,
        goal:         input.goal,
        systemPrompt: input.systemPrompt,
        maxSteps,
        memoryContext: memoryContext ?? undefined,
      },
      { maxContinuations },
    );

    // ── Persist run summary to .nura/ ────────────────────────────────────────
    // Fire-and-forget — memory writes must not affect run outcome
    void summarizeAndPersist(projectId, runId, input.goal, result);

    emitAgentEvent({
      runId,
      projectId,
      phase:     "tool-loop",
      eventType: result.success ? "phase.completed" : "phase.failed",
      payload:   {
        steps:      result.steps,
        stopReason: result.stopReason,
        summary:    result.summary,
        error:      result.error,
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
