/**
 * debug-orchestrator.ts
 *
 * Autonomous debug orchestrator — the main entry point for crash recovery.
 *
 * Lifecycle per crash:
 *   1. Cooldown + deduplication guard
 *   2. Build debug session (logs → extract → correlate → checkpoint)
 *   3. Build enriched recovery goal
 *   4. Run LLM recovery agent (existing tool-loop)
 *   5. Capture pre-patch error count
 *   6. Restart server and verify post-patch
 *   7. Rollback if verdict is "worsened"
 *   8. Record outcome in memory
 *   9. Escalate after maxAttempts consecutive failures
 *
 * Replaces the inline logic in crash-responder.ts — crash-responder now
 * delegates here instead of managing state itself.
 *
 * Ownership: autonomous-debug/core — orchestration only.
 * Delegates: session-builder, goal-builder, tool-loop, verifier, rollback, memory, events.
 * MAX 250 lines.
 */

import { runAgentLoopWithContinuation } from "../../core/tool-loop/index.ts";
import { runtimeManager }               from "../../../infrastructure/runtime/runtime-manager.ts";
import { getProjectDir }                from "../../../infrastructure/sandbox/sandbox.util.ts";
import { classifyFailure }              from "../../core/recovery/agents/failure-classifier.agent.ts";

import { buildDebugSession }          from "./debug-session-builder.ts";
import { buildRecoveryGoal }          from "./recovery-goal-builder.ts";
import { verifyAfterPatch, capturePrePatchErrorCount } from "../verification/post-patch-verifier.ts";
import { rollbackToCheckpoint }       from "../patchers/rollback-manager.ts";
import { recordAttempt, getConsecutiveFailures, resetConsecutiveFailures } from "../memory/recovery-memory.ts";
import {
  emitSessionStarted, emitAnalysisComplete,
  emitPatchApplied, emitVerifyComplete,
  emitRollbackTriggered, emitRollbackComplete,
  emitEscalation,
} from "../events/debug-event-emitter.ts";

// ─── Config ───────────────────────────────────────────────────────────────────

const COOLDOWN_MS       = 30_000;
const MAX_ATTEMPTS      = 3;
const MAX_STEPS         = 15;
const MAX_CONTINUATIONS = 1;

// ─── Per-project state ────────────────────────────────────────────────────────

const activeRuns  = new Set<number>();
const lastAttempt = new Map<number, number>();

// ─── Guard ────────────────────────────────────────────────────────────────────

function canAttempt(projectId: number): boolean {
  if (activeRuns.has(projectId)) return false;
  const elapsed = Date.now() - (lastAttempt.get(projectId) ?? 0);
  return elapsed >= COOLDOWN_MS;
}

// ─── Core ─────────────────────────────────────────────────────────────────────

export async function handleCrash(
  projectId:    number,
  errorPayload: unknown,
): Promise<void> {
  if (!canAttempt(projectId)) return;

  const consecutiveFailures = getConsecutiveFailures(projectId);
  if (consecutiveFailures >= MAX_ATTEMPTS) {
    const logs = runtimeManager.getLogs(projectId, 20);
    emitEscalation({
      projectId,
      sessionId: `escalation-${Date.now()}`,
      reason:    `Recovery abandoned after ${MAX_ATTEMPTS} consecutive failures. Manual intervention required.`,
      attempts:  consecutiveFailures,
      lastError: logs.slice(-3).join(" | ").slice(0, 500),
      ts:        Date.now(),
    });
    console.warn(`[debug-orchestrator] project ${projectId} — escalated after ${consecutiveFailures} failures`);
    return;
  }

  activeRuns.add(projectId);
  lastAttempt.set(projectId, Date.now());

  const attempt = consecutiveFailures + 1;

  // 1. Classify the crash type
  const crashLogs   = runtimeManager.getLogs(projectId, 30);
  const errorCtx    = crashLogs.slice(-10).join(" ") || String(errorPayload);
  const classified  = classifyFailure({ message: errorCtx, hasError: true });

  console.log(`[debug-orchestrator] project ${projectId} attempt ${attempt}/${MAX_ATTEMPTS} — type=${classified.type}`);
  emitSessionStarted(projectId, `session-${Date.now()}`, classified.type, attempt);

  // 2. Build debug session
  const session = await buildDebugSession(projectId, classified.type, crashLogs);

  emitAnalysisComplete(
    projectId, session.sessionId,
    session.correlations, session.extractedErrors.length,
  );

  // 3. Capture pre-patch baseline
  const preErrorCount = capturePrePatchErrorCount(projectId);

  // 4. Build enriched goal and run LLM
  const goal = buildRecoveryGoal(session, attempt, MAX_ATTEMPTS);

  let llmSuccess = false;
  let llmSummary = "";
  let llmSteps   = 0;

  try {
    const result = await runAgentLoopWithContinuation(
      { projectId, runId: `debug-${projectId}-${session.sessionId}`, goal, maxSteps: MAX_STEPS },
      { maxContinuations: MAX_CONTINUATIONS },
    );
    llmSuccess = result.success;
    llmSummary = result.summary ?? "";
    llmSteps   = result.steps ?? 0;
  } catch (err: any) {
    llmSummary = err?.message ?? String(err);
    console.error(`[debug-orchestrator] LLM recovery threw: ${llmSummary}`);
  }

  emitPatchApplied(projectId, session.sessionId, llmSuccess, llmSummary, llmSteps);

  // 5. Post-patch verification
  const verdict = await verifyAfterPatch(projectId, preErrorCount);
  emitVerifyComplete(projectId, session.sessionId, verdict);

  // 6. Rollback if patch worsened things and checkpoint exists
  if (verdict.outcome === "worsened" && session.checkpointCreated) {
    emitRollbackTriggered(projectId, session.sessionId, verdict.summary);
    const sandboxRoot = getProjectDir(projectId);
    const rb = await rollbackToCheckpoint(projectId, session.sessionId, sandboxRoot);
    emitRollbackComplete(projectId, session.sessionId, rb.restoredFiles.length, rb.success);
    console.log(`[debug-orchestrator] Rollback: ${rb.reason}`);
    // Restart after rollback to get back to pre-patch state
    await runtimeManager.restart(projectId);
  }

  // 7. Record outcome in memory
  const success = llmSuccess && verdict.healthy;
  recordAttempt(projectId, {
    ts:           Date.now(),
    sessionId:    session.sessionId,
    errorType:    classified.type,
    outcome:      success ? "success" : "failure",
    summary:      llmSummary.slice(0, 300),
    steps:        llmSteps,
    patchedFiles: session.extractedErrors.flatMap(e => e.frames.map(f => f.file)).slice(0, 10),
  });

  if (success) {
    resetConsecutiveFailures(projectId);
    console.log(`[debug-orchestrator] project ${projectId} — recovery succeeded (${llmSteps} steps)`);
  } else {
    console.warn(`[debug-orchestrator] project ${projectId} — attempt ${attempt} failed: ${llmSummary.slice(0, 120)}`);
  }

  activeRuns.delete(projectId);
}

/** Reset state for a project (call when user manually re-deploys). */
export function resetProject(projectId: number): void {
  activeRuns.delete(projectId);
  lastAttempt.delete(projectId);
  resetConsecutiveFailures(projectId);
}

/** Expose state for health endpoints. */
export function getOrchestratorState(projectId: number) {
  return {
    active:              activeRuns.has(projectId),
    consecutiveFailures: getConsecutiveFailures(projectId),
    maxAttempts:         MAX_ATTEMPTS,
    cooldownRemainingMs: Math.max(0, COOLDOWN_MS - (Date.now() - (lastAttempt.get(projectId) ?? 0))),
  };
}
