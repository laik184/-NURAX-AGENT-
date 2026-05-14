/**
 * phase.executor.ts
 *
 * Executes a single ExecutionPhase through the tool-loop agent.
 * Wraps runAgentLoop with phase-aware context injection and result capture.
 *
 * Key behaviour:
 *   - Injects completed-phase summaries as context for each new phase
 *   - On retry: injects the previous error so the agent tries a different strategy
 *   - Emits phase.started / phase.completed / phase.failed events
 */

import { runAgentLoop } from "../core/tool-loop/tool-loop.agent.ts";
import { bus } from "../../infrastructure/events/bus.ts";
import type { ExecutionPhase, PhaseResult } from "./planner.types.ts";

export interface PhaseExecutorInput {
  phase: ExecutionPhase;
  phaseIndex: number;
  totalPhases: number;
  projectId: number;
  runId: string;
  overallGoal: string;
  maxStepsPerPhase: number;
  completedSummaries: string[];
  signal?: AbortSignal;
  /** Set on retries — tells the agent what went wrong so it can try differently. */
  previousError?: string;
}

function buildPhaseGoal(input: PhaseExecutorInput): string {
  const { phase, phaseIndex, totalPhases, overallGoal, completedSummaries, previousError } = input;

  const contextBlock =
    completedSummaries.length > 0
      ? `\n\nCOMPLETED PHASES:\n${completedSummaries
          .map((s, i) => `  Phase ${i + 1}: ${s}`)
          .join("\n")}`
      : "";

  const retryBlock = previousError
    ? `\n\n⚠️ RETRY: Previous attempt failed.\nError: ${previousError.slice(0, 300)}\nDo NOT repeat the same approach. Diagnose the root cause and try a different strategy.`
    : "";

  return `OVERALL GOAL: ${overallGoal}

CURRENT PHASE: ${phaseIndex + 1} of ${totalPhases} — "${phase.title}"
OBJECTIVE: ${phase.objective}
${phase.files.length > 0 ? `FILES TO WORK ON:\n${phase.files.map((f) => `  - ${f}`).join("\n")}` : ""}
${phase.tools.length > 0 ? `PREFERRED TOOLS: ${phase.tools.join(", ")}` : ""}
VERIFICATION: ${phase.verification}
${contextBlock}${retryBlock}

Focus ONLY on this phase's objective. Do not implement future phases.
When done, call task_complete with a summary of what was accomplished.`;
}

function emitPhaseEvent(
  runId: string,
  projectId: number,
  eventType: string,
  payload: unknown
): void {
  bus.emit("agent.event", {
    runId,
    projectId,
    phase: "planner",
    eventType: eventType as any,
    payload,
    ts: Date.now(),
  });
}

export async function executePhase(input: PhaseExecutorInput): Promise<PhaseResult> {
  const { phase, phaseIndex, totalPhases, projectId, runId, maxStepsPerPhase } = input;
  const startMs = Date.now();

  emitPhaseEvent(runId, projectId, "phase.started", {
    phaseId: phase.id,
    title: phase.title,
    objective: phase.objective,
    index: phaseIndex + 1,
    total: totalPhases,
    isRetry: !!input.previousError,
  });

  const phaseGoal = buildPhaseGoal(input);

  let result: Awaited<ReturnType<typeof runAgentLoop>>;
  try {
    result = await runAgentLoop({
      projectId,
      runId,
      goal: phaseGoal,
      maxSteps: maxStepsPerPhase,
      signal: input.signal,
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    const phaseResult: PhaseResult = {
      phaseId: phase.id,
      success: false,
      steps: 0,
      summary: `Phase crashed: ${error}`,
      stopReason: "error",
      error,
      durationMs: Date.now() - startMs,
    };
    emitPhaseEvent(runId, projectId, "phase.failed", phaseResult);
    return phaseResult;
  }

  const phaseResult: PhaseResult = {
    phaseId: phase.id,
    success: result.success,
    steps: result.steps,
    summary: result.summary,
    stopReason: result.stopReason,
    error: result.error,
    durationMs: Date.now() - startMs,
  };

  emitPhaseEvent(
    runId,
    projectId,
    result.success ? "phase.completed" : "phase.failed",
    {
      phaseId: phase.id,
      title: phase.title,
      ...phaseResult,
    }
  );

  return phaseResult;
}
