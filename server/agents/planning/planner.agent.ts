/**
 * planner.agent.ts
 *
 * The main Planner Agent orchestrator.
 *
 * Flow:
 *   PlannerInput
 *     → generatePlan()           — LLM decomposes goal into phases
 *     → savePlan()               — persist plan to sandbox
 *     → emit plan.created        — surface plan structure to frontend
 *     → for each phase:
 *         emit plan.progress     — % complete + current phase name
 *         runWithRetry(phase)    — execute via tool-loop, retry with error context
 *         savePhaseResult()      — persist result
 *         completedSummaries     — passed as context to next phase
 *     → emit plan.progress 100%  — final signal
 *     → PlannerResult
 *
 * Retry policy:
 *   On first failure: re-run executePhase with previousError injected into prompt
 *   so the agent knows what went wrong and tries a different approach.
 *
 * Failed phase tracking:
 *   Failed phase summaries are prefixed "[FAILED]" in completedSummaries
 *   so subsequent phases know which prior phases did not complete correctly.
 */

import { generatePlan, needsPlanning } from "./planner.service.ts";
import { executePhase } from "./phase.executor.ts";
import { savePlan, savePhaseResult } from "./planner.memory.ts";
import { fallbackPlan } from "./planner.validators.ts";
import { bus } from "../../infrastructure/events/bus.ts";
import type { PlannerInput, PlannerResult, PhaseResult } from "./planner.types.ts";

const DEFAULT_MAX_STEPS_PER_PHASE = 20;
const MAX_PHASE_RETRIES = 1;

function emit(runId: string, projectId: number, eventType: string, payload: unknown): void {
  bus.emit("agent.event", {
    runId,
    projectId,
    phase: "planner",
    eventType: eventType as any,
    payload,
    ts: Date.now(),
  });
}

/**
 * Execute a phase with retry.
 * On failure: passes the error message to the next attempt so the agent
 * can diagnose and try a different approach instead of repeating the same error.
 */
async function runWithRetry(
  fn: (previousError?: string) => Promise<PhaseResult>,
  maxRetries: number
): Promise<PhaseResult> {
  let lastResult: PhaseResult | null = null;
  let previousError: string | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await fn(previousError);
    lastResult = result;
    if (result.success) return result;

    previousError = result.error
      ? `${result.summary}: ${result.error}`
      : result.summary;

    if (attempt < maxRetries) {
      console.warn(
        `[planner] Phase ${result.phaseId} attempt ${attempt + 1} failed — retrying with error context: ${previousError?.slice(0, 120)}`
      );
    }
  }

  return lastResult!;
}

export async function runPlannerAgent(input: PlannerInput): Promise<PlannerResult> {
  const startMs = Date.now();
  const maxStepsPerPhase = input.maxStepsPerPhase ?? DEFAULT_MAX_STEPS_PER_PHASE;

  emit(input.runId, input.projectId, "agent.thinking", {
    text: "Analyzing goal and building execution plan…",
  });

  const plan = await generatePlan(input).catch((err) => {
    console.error("[planner] generatePlan threw:", err);
    return fallbackPlan(input.goal, input.runId, input.projectId);
  });

  await savePlan(plan).catch(() => {});

  // Surface the full plan structure to the frontend immediately
  emit(input.runId, input.projectId, "plan.created", {
    phases: plan.phases.length,
    complexity: plan.estimatedComplexity,
    appType: plan.appType,
    strategy: plan.executionStrategy,
    phaseList: plan.phases.map((p) => ({ id: p.id, title: p.title, priority: p.priority })),
    risks: plan.risks,
  });

  emit(input.runId, input.projectId, "agent.message", {
    text:
      `Plan ready: ${plan.phases.length} phase${plan.phases.length !== 1 ? "s" : ""} · ` +
      `${plan.estimatedComplexity} · ${plan.appType}`,
  });

  const phaseResults: PhaseResult[] = [];
  const completedSummaries: string[] = [];
  let totalSteps = 0;
  let overallSuccess = true;

  for (let i = 0; i < plan.phases.length; i++) {
    const phase = plan.phases[i];

    if (input.signal?.aborted) {
      emit(input.runId, input.projectId, "agent.message", { text: "Run cancelled by user." });
      break;
    }

    // Emit progress BEFORE starting the phase so the UI updates immediately
    emit(input.runId, input.projectId, "plan.progress", {
      completed: i,
      total: plan.phases.length,
      percent: Math.round((i / plan.phases.length) * 100),
      currentPhase: phase.title,
      phaseIndex: i + 1,
    });

    const result = await runWithRetry(
      (previousError) =>
        executePhase({
          phase,
          phaseIndex: i,
          totalPhases: plan.phases.length,
          projectId: input.projectId,
          runId: input.runId,
          overallGoal: input.goal,
          maxStepsPerPhase,
          completedSummaries: [...completedSummaries],
          signal: input.signal,
          previousError,
        }),
      MAX_PHASE_RETRIES
    );

    phaseResults.push(result);
    totalSteps += result.steps;

    // Prefix failed summaries so subsequent phases understand prior context
    const prefix = result.success ? "" : "[FAILED] ";
    completedSummaries.push(`${prefix}[${phase.title}] ${result.summary}`);

    await savePhaseResult(input.projectId, input.runId, result).catch(() => {});

    if (!result.success) {
      overallSuccess = false;
      emit(input.runId, input.projectId, "agent.message", {
        text: `Phase "${phase.title}" did not fully complete — continuing with next phase.`,
      });
    }
  }

  // Emit final progress (100%)
  emit(input.runId, input.projectId, "plan.progress", {
    completed: plan.phases.length,
    total: plan.phases.length,
    percent: 100,
    currentPhase: null,
    phaseIndex: plan.phases.length,
  });

  const succeeded = phaseResults.filter((r) => r.success).length;
  const summary = overallSuccess
    ? `All ${plan.phases.length} phases completed successfully.`
    : `Completed with issues: ${succeeded}/${plan.phases.length} phases succeeded.`;

  emit(input.runId, input.projectId, "agent.message", { text: summary });

  return {
    plan,
    phaseResults,
    overallSuccess,
    totalSteps,
    durationMs: Date.now() - startMs,
  };
}

export { needsPlanning };
