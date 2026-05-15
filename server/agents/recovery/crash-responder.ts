/**
 * crash-responder.ts
 *
 * Autonomous recovery trigger.
 *
 * Subscribes to "process.crashed" events on the shared bus and launches a
 * self-healing agent run using the existing LLM tool-loop.  The agent is
 * given the crash logs and a structured goal to diagnose → fix → restart.
 *
 * Guards per project:
 *   - One active recovery run at a time
 *   - 30 s cooldown between consecutive attempts
 *   - Max 3 consecutive attempts before escalating to the user
 *
 * The existing tools (server_logs, server_restart, file_write, file_replace,
 * shell_exec, package_install) give the agent everything it needs.  No
 * hardcoded action maps, no simulation — the LLM drives real recovery.
 */

import { bus, type AgentEvent } from "../../infrastructure/events/bus.ts";
import { runtimeManager } from "../../infrastructure/runtime/runtime-manager.ts";
import { classifyFailure } from "../core/recovery/agents/failure-classifier.agent.ts";
import { runAgentLoopWithContinuation } from "../core/tool-loop/index.ts";

// ─── Constants ────────────────────────────────────────────────────────────────

const COOLDOWN_MS    = 30_000;   // Min gap between attempts per project
const MAX_ATTEMPTS   = 3;        // Consecutive failures before giving up
const LOG_TAIL       = 80;       // Log lines fed to the recovery goal
const MAX_STEPS      = 15;       // Recovery runs are short and focused
const MAX_CONTINUATIONS = 1;

// ─── Per-project state ────────────────────────────────────────────────────────

const activeRuns   = new Set<number>();
const lastAttempt  = new Map<number, number>();
const attemptCount = new Map<number, number>();

// ─── Event helpers ────────────────────────────────────────────────────────────

function emitRecovery(projectId: number, type: string, payload: unknown): void {
  bus.emit("agent.event", {
    runId:     `recovery-${projectId}`,
    projectId,
    phase:     "recovery",
    eventType: type as any,
    payload,
    ts: Date.now(),
  });
}

// ─── Recovery goal ────────────────────────────────────────────────────────────

function buildRecoveryGoal(projectId: number, logs: string[]): string {
  const logBlock = logs.length > 0
    ? logs.slice(-LOG_TAIL).join("\n").slice(0, 4_000)
    : "(no logs captured — process exited without output)";

  return [
    `AUTONOMOUS RECOVERY MODE — project ${projectId} server crashed.`,
    "",
    "CRASH LOGS (most recent):",
    "```",
    logBlock,
    "```",
    "",
    "Work through these steps autonomously — do NOT ask for confirmation:",
    "1. Call server_logs to get any additional context not shown above.",
    "2. Identify the root cause:",
    "   • SyntaxError / unexpected token   → fix the file with file_replace or file_write",
    "   • Cannot find module / ENOENT       → run package_install for the missing package",
    "   • EADDRINUSE / port in use          → call server_stop then server_start",
    "   • TypeError / ReferenceError        → locate and fix the offending code",
    "   • Generic crash / unknown           → restart with server_restart and see if it clears",
    "3. Apply your fix.",
    "4. Call server_restart to bring the server back up.",
    "5. Wait a moment, then call server_logs to verify the server started cleanly.",
    "6. If still failing, attempt one more targeted fix before giving up.",
    "7. When the server is running cleanly, call task_complete with a short summary of what you fixed.",
  ].join("\n");
}

// ─── Core recovery handler ────────────────────────────────────────────────────

async function handleCrash(projectId: number): Promise<void> {
  if (activeRuns.has(projectId)) return;

  const now  = Date.now();
  const last = lastAttempt.get(projectId) ?? 0;
  if (now - last < COOLDOWN_MS) return;

  const count = (attemptCount.get(projectId) ?? 0) + 1;
  if (count > MAX_ATTEMPTS) {
    console.warn(`[crash-responder] project ${projectId} — exceeded max attempts (${MAX_ATTEMPTS}), giving up`);
    emitRecovery(projectId, "recovery.failed", {
      reason:      `Recovery abandoned after ${MAX_ATTEMPTS} consecutive attempts. Manual intervention required.`,
      attempts:    MAX_ATTEMPTS,
      maxAttempts: MAX_ATTEMPTS,
    });
    return;
  }

  activeRuns.add(projectId);
  lastAttempt.set(projectId, now);
  attemptCount.set(projectId, count);

  const runId = `recovery-${projectId}-${now}`;
  const logs  = runtimeManager.getLogs(projectId, LOG_TAIL);
  const errorContext = logs.slice(-10).join(" ");

  const classification = classifyFailure({
    message:  errorContext || "process exited with non-zero code",
    hasError: true,
  });

  console.log(
    `[crash-responder] project ${projectId} — attempt ${count}/${MAX_ATTEMPTS} ` +
    `type=${classification.type} recoverable=${classification.isRecoverable}`
  );

  emitRecovery(projectId, "recovery.started", {
    attempt:    count,
    maxAttempts: MAX_ATTEMPTS,
    errorType:  classification.type,
    recoverable: classification.isRecoverable,
    runId,
  });

  try {
    const goal   = buildRecoveryGoal(projectId, logs);
    const result = await runAgentLoopWithContinuation(
      { projectId, runId, goal, maxSteps: MAX_STEPS },
      { maxContinuations: MAX_CONTINUATIONS },
    );

    if (result.success) {
      attemptCount.set(projectId, 0);
      console.log(`[crash-responder] project ${projectId} — recovery succeeded in ${result.steps} steps`);
      emitRecovery(projectId, "recovery.completed", {
        attempt:    count,
        steps:      result.steps,
        summary:    result.summary,
        runId,
      });
    } else {
      console.warn(`[crash-responder] project ${projectId} — attempt ${count} failed: ${result.summary}`);
      emitRecovery(projectId, "recovery.failed", {
        attempt:     count,
        maxAttempts: MAX_ATTEMPTS,
        reason:      result.summary,
        runId,
      });
    }
  } catch (err: any) {
    const msg = err?.message || String(err);
    console.error(`[crash-responder] project ${projectId} — recovery threw: ${msg}`);
    emitRecovery(projectId, "recovery.failed", {
      attempt:     count,
      maxAttempts: MAX_ATTEMPTS,
      reason:      msg,
      runId,
    });
  } finally {
    activeRuns.delete(projectId);
  }
}

// ─── Bus subscriber ───────────────────────────────────────────────────────────

function onAgentEvent(event: AgentEvent): void {
  if (event.eventType !== "process.crashed") return;
  if (!event.projectId) return;
  if (!process.env.OPENROUTER_API_KEY) return;

  handleCrash(event.projectId).catch((err) =>
    console.error(`[crash-responder] unhandled error: ${err?.message}`)
  );
}

// ─── Singleton API ────────────────────────────────────────────────────────────

let unsubscribe: (() => void) | null = null;

export const crashResponder = {
  start(): void {
    if (unsubscribe) return;
    unsubscribe = bus.subscribe("agent.event", onAgentEvent);
    console.log("[crash-responder] Started — listening for process.crashed events");
  },

  stop(): void {
    unsubscribe?.();
    unsubscribe = null;
  },

  /** Reset counters for a project (call when user manually re-deploys). */
  resetProject(projectId: number): void {
    attemptCount.delete(projectId);
    lastAttempt.delete(projectId);
    activeRuns.delete(projectId);
  },

  /** Expose state for health/admin endpoints. */
  getState(projectId: number) {
    return {
      active:              activeRuns.has(projectId),
      attempts:            attemptCount.get(projectId) ?? 0,
      maxAttempts:         MAX_ATTEMPTS,
      lastAttemptMs:       lastAttempt.get(projectId) ?? null,
      cooldownRemainingMs: Math.max(0, COOLDOWN_MS - (Date.now() - (lastAttempt.get(projectId) ?? 0))),
    };
  },
};
