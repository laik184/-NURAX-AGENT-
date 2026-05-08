import type { PipelineInput, PipelineOutput, PhaseResult } from './types.ts';
import { checkSafety } from './agents/safety-gate.agent.ts';
import { runPhase, runPhaseAsync } from './agents/phase-runner.agent.ts';
import { collectResults } from './agents/result-collector.agent.ts';
import {
  initPipeline,
  advancePhase,
  recordPhaseResult,
  setStatus,
  recordRun,
  clearState,
} from './state.ts';
import { buildPhaseSummary } from './utils/phase-tracker.util.ts';
import { collectError, clearErrors } from './utils/error-collector.util.ts';

import { route } from '../router/orchestrator.ts';
import { runDecisionEngine } from '../../intelligence/decision-engine/orchestrator.ts';
import { plan } from '../../intelligence/planning/planner/PlannerBoss/orchestrator.ts';
import { validate } from '../../intelligence/validation-engine/orchestrator.ts';
import { recover } from '../recovery/orchestrator.ts';
import { runFeedbackLoop } from '../../intelligence/feedback-loop/orchestrator.ts';
import { processMemory } from '../memory/orchestrator.ts';
import { dispatch, getRegistryStats, WORKER_DISPATCH_DOMAINS, type DispatchRequest } from './registry/dispatcher.ts';
import type { OrchestratorDomain } from './registry/orchestrator.registry.ts';

const DEFAULT_MAX_FEEDBACK_ATTEMPTS = 3;

// ─── RECURSION DEPTH GUARD ────────────────────────────────────────────────────
// Prevents re-entrant calls to executePipeline() with the same requestId.
// A requestId should only be executing once at any given moment. If it appears
// here, it means a dispatch path looped back into executePipeline() — crash fast
// with a clear error instead of stack-overflowing.
const _activePipelines = new Map<string, number>();
const MAX_PIPELINE_DEPTH = 1;

function enterPipeline(requestId: string): void {
  const depth = (_activePipelines.get(requestId) ?? 0) + 1;
  if (depth > MAX_PIPELINE_DEPTH) {
    throw new Error(
      `[executePipeline] Recursion guard triggered for requestId="${requestId}". ` +
      `executePipeline is already executing at depth=${depth - 1}. ` +
      `A dispatch path is looping back into the pipeline — check the worker registry for orchestration-layer components.`,
    );
  }
  _activePipelines.set(requestId, depth);
}

function exitPipeline(requestId: string): void {
  const depth = _activePipelines.get(requestId) ?? 0;
  if (depth <= 1) {
    _activePipelines.delete(requestId);
  } else {
    _activePipelines.set(requestId, depth - 1);
  }
}

// ─── WORKER-ONLY DOMAIN FILTER FOR PHASE 6 ───────────────────────────────────
// Phase 6 dispatch must only target worker domains, never orchestration-layer
// components (core-support phase orchestrators, platform-services).
const PHASE6_DOMAIN_FILTER: readonly OrchestratorDomain[] = Object.freeze([...WORKER_DISPATCH_DOMAINS] as OrchestratorDomain[]);

function makeRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function executePipeline(input: PipelineInput): Promise<PipelineOutput> {
  const requestId = input.requestId || makeRequestId();
  const startedAt = Date.now();
  const phases: PhaseResult[] = [];
  const logs: string[] = [];

  // ── Recursion guard: fail fast if this requestId is already executing ────────
  enterPipeline(requestId);

  clearErrors();
  initPipeline(requestId);

  logs.push(`[pipeline] ▶ START requestId=${requestId}`);

  function pushPhase(result: PhaseResult): boolean {
    phases.push(result);
    recordPhaseResult(result);
    result.logs.forEach((l) => logs.push(l));
    if (!result.success) {
      collectError(result.phase, result.error ?? 'unknown error');
      advancePhase('failed');
      setStatus('failed');
      recordRun(false, Date.now() - startedAt, result.phase);
      return false;
    }
    return true;
  }

  try {
    // ── PHASE 1: Safety Check ─────────────────────────────────────────────────
    advancePhase('safety-check');
    const safetyResult = runPhase('safety-check', () => {
      const check = checkSafety(input);
      if (!check.safe) throw new Error(`Safety gate blocked: ${check.reason} (by: ${check.blockedBy ?? 'guard'})`);
      return check;
    });
    if (!pushPhase(safetyResult)) return collectResults(requestId, phases, startedAt);

    // ── PHASE 2: Routing ──────────────────────────────────────────────────────
    advancePhase('routing');
    const routingResult = runPhase('routing', () => {
      const result = route({ input: input.input, context: input.context });
      if (!result.success) throw new Error(`Router failed: ${result.error ?? 'unknown'}`);
      return result;
    });
    if (!pushPhase(routingResult)) return collectResults(requestId, phases, startedAt);

    const routeData = routingResult.data as { domain: string; module: string; agent: string };

    // ── PHASE 3: Decision Engine ──────────────────────────────────────────────
    advancePhase('decision');
    const decisionResult = runPhase('decision', () => {
      const result = runDecisionEngine({
        requestId,
        userInput: input.input,
        availableAgents: [routeData.agent ?? 'default-agent'],
        context: (input.context as Record<string, unknown>) ?? {},
        timestamp: Date.now(),
      });
      if (!result.success) throw new Error('Decision engine failed to produce a strategy');
      return result;
    });
    if (!pushPhase(decisionResult)) return collectResults(requestId, phases, startedAt);

    // ── PHASE 4: Planning ─────────────────────────────────────────────────────
    advancePhase('planning');
    const planningResult = runPhase('planning', () => {
      const result = plan({
        rawInput: input.input,
        sessionId: input.sessionId,
      });
      if (!result.ok) throw new Error(`Planning failed: ${result.error} (code: ${result.code})`);
      return result.data;
    });
    if (!pushPhase(planningResult)) return collectResults(requestId, phases, startedAt);

    // ── PHASE 5: Validation ───────────────────────────────────────────────────
    advancePhase('validation');
    const validationResult = runPhase('validation', () => {
      const result = validate({
        code: input.input,
        source: 'unknown' as const,
        agentId: requestId,
        context: input.context as Record<string, string> | undefined,
      });
      if (!result.success && result.score < 0.3) {
        throw new Error(`Validation hard-failed: score=${result.score}, issues=${result.issues?.length ?? 0}`);
      }
      return result;
    });
    if (!pushPhase(validationResult)) return collectResults(requestId, phases, startedAt);

    // ── PHASE 6: Generation — dispatch to registry orchestrators ─────────────
    advancePhase('generation');
    const generationTs = Date.now();
    const generationResult = await runPhaseAsync('generation', async () => {
      const decision = decisionResult.data as {
        decision?: { selectedAgents?: string[]; selectedStrategy?: string; capabilities?: string[] };
      } | undefined;
      const planData = planningResult.data as unknown as {
        intent?: { requiredCapabilities?: string[] };
        capabilityMap?: { routes?: Array<{ capability: string }> };
      } | undefined;

      // Collect capabilities from decision engine + planning output
      const caps: string[] = [
        ...(decision?.decision?.capabilities ?? []),
        ...(decision?.decision?.selectedAgents ?? []),
        ...(planData?.intent?.requiredCapabilities ?? []),
        ...(planData?.capabilityMap?.routes?.map((r) => r.capability) ?? []),
        routeData.domain,
        routeData.module,
      ].filter(Boolean);

      // ── Phase 6 domain filter: only worker domains, never orchestration-layer ─
      // This prevents phase orchestrators (core-support) and platform services
      // from being re-dispatched mid-pipeline.
      const dispatchResult = await dispatch({
        capabilities: Object.freeze([...new Set(caps)]),
        input: Object.freeze({ requestId, userInput: input.input, context: input.context }),
        maxOrchestrators: 5,
        domainFilter: PHASE6_DOMAIN_FILTER,
      });

      return Object.freeze({
        dispatched: dispatchResult.totalDispatched,
        succeeded: dispatchResult.succeeded,
        failed: dispatchResult.failed,
        results: dispatchResult.results,
        registryStats: getRegistryStats(),
        strategy: decision?.decision?.selectedStrategy ?? 'PARALLEL',
      });
    });
    if (!pushPhase(generationResult)) return collectResults(requestId, phases, startedAt);

    advancePhase('execution');
    const executionTs = Date.now();
    const dispatchData = generationResult.data as { dispatched: number; succeeded: number } | undefined;
    const executionResult = runPhase('execution', () => {
      return Object.freeze({
        executed: true,
        orchestratorsRan: dispatchData?.dispatched ?? 0,
        orchestratorsSucceeded: dispatchData?.succeeded ?? 0,
        durationMs: Date.now() - executionTs,
      });
    });

    let executionSucceeded = executionResult.success;
    pushPhase(executionResult);

    // ── PHASE 7: Recovery (conditional — only if execution failed) ────────────
    if (!executionSucceeded) {
      advancePhase('recovery');
      const recoveryResult = runPhase('recovery', () => {
        const result = recover({
          error: executionResult.error ?? 'Execution phase failure',
          agentId: requestId,
          context: Object.freeze({ phase: 'execution', input: input.input }),
        });
        if (!result.success && !result.recovered) {
          throw new Error(`Recovery exhausted after ${result.attempts} attempt(s): ${result.error}`);
        }
        executionSucceeded = result.recovered;
        return result;
      });
      if (!pushPhase(recoveryResult)) return collectResults(requestId, phases, startedAt);
    }

    // ── PHASE 8: Feedback Loop ────────────────────────────────────────────────
    advancePhase('feedback');
    const feedbackResult = runPhase('feedback', () => {
      const result = runFeedbackLoop({
        requestId,
        executionResult: Object.freeze({
          output: generationResult.data ?? null,
          agentId: requestId,
          timestamp: generationTs,
          durationMs: Date.now() - generationTs,
        }),
        maxAttempts: input.maxFeedbackAttempts ?? DEFAULT_MAX_FEEDBACK_ATTEMPTS,
        currentAttempt: 1,
        history: [],
      });
      return result;
    });
    pushPhase(feedbackResult);

    // ── PHASE 9: Memory ───────────────────────────────────────────────────────
    advancePhase('memory');
    const memoryResult = await runPhaseAsync('memory', async () => {
      return await processMemory(Object.freeze({
        id: `mem-${requestId}`,
        content: input.input,
        timestamp: Date.now(),
        tags: Object.freeze(['pipeline', routeData.domain ?? 'unknown']),
        source: 'pipeline-orchestrator',
        success: executionSucceeded,
        sessionId: input.sessionId,
      }));
    });
    pushPhase(memoryResult);

    // ── Complete ──────────────────────────────────────────────────────────────
    advancePhase('complete');
    setStatus('success');
    recordRun(true, Date.now() - startedAt);

    logs.push(`[pipeline] ✓ COMPLETE ${buildPhaseSummary(phases)}`);
    exitPipeline(requestId);
    return collectResults(requestId, phases, startedAt);

  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logs.push(`[pipeline] ✗ FATAL: ${error}`);
    advancePhase('failed');
    setStatus('failed');
    recordRun(false, Date.now() - startedAt, 'failed');

    phases.push(Object.freeze<PhaseResult>({
      phase: 'failed',
      success: false,
      error,
      durationMs: Date.now() - startedAt,
      logs: Object.freeze(logs),
    }));

    clearState();
    exitPipeline(requestId);
    return collectResults(requestId, phases, startedAt);
  }
}

export { getMetrics } from './state.ts';
