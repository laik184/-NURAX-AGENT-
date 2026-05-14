/**
 * planner.agent.ts
 *
 * The main Planner Agent orchestrator.
 *
 * Flow:
 *   PlannerInput
 *     → generatePlan()      — LLM decomposes goal into phases
 *     → savePlan()          — persist plan artifact
 *     → emit plan.created   — surface plan to frontend via SSE
 *     → executePhase() × N  — run each phase through the tool-loop
 *     → savePhaseResult()   — persist result per phase
 *     → PlannerResult
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

async function runWithRetry(
  fn: () => Promise<PhaseResult>,
  maxRetries: number
): Promise<PhaseResult> {
  let lastResult: PhaseResult | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await fn();
    lastResult = result;
    if (result.success) return result;
    if (attempt < maxRetries) {
      console.warn(`[planner] Phase ${result.phaseId} failed — retrying (attempt ${attempt + 1})`);
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

  let plan = await generatePlan(input).catch((err) => {
    console.error("[planner] generatePlan threw:", err);
    return fallbackPlan(input.goal, input.runId, input.projectId);
  });

  await savePlan(plan).catch(() => {});

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
      `Plan ready: ${plan.phases.length} phase(s) · ` +
      `Complexity: ${plan.estimatedComplexity} · ` +
      `App type: ${plan.appType}`,
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

    const result = await runWithRetry(
      () =>
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
        }),
      MAX_PHASE_RETRIES
    );

    phaseResults.push(result);
    totalSteps += result.steps;
    completedSummaries.push(`[${phase.title}] ${result.summary}`);
    await savePhaseResult(input.projectId, input.runId, result).catch(() => {});

    if (!result.success) {
      overallSuccess = false;
      emit(input.runId, input.projectId, "agent.message", {
        text: `Phase "${phase.title}" did not fully complete — continuing with next phase.`,
      });
    }
  }

  const summary = overallSuccess
    ? `All ${plan.phases.length} phases completed successfully.`
    : `Completed with issues. ${phaseResults.filter((r) => r.success).length}/${plan.phases.length} phases succeeded.`;

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
