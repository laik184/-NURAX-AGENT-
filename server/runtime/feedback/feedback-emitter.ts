/**
 * feedback-emitter.ts
 *
 * Emit structured runtime observation events onto the shared bus so that:
 *   - SSE clients (browser UI) receive real-time runtime health updates
 *   - The crash-responder can react to observation failures
 *   - The agent event log captures verification outcomes
 *
 * Ownership: runtime/feedback — single responsibility: bus emission.
 * No logic, no state, pure emit wrappers.
 */

import { bus } from "../../infrastructure/events/bus.ts";
import type { VerificationResult } from "../verification/verification-types.ts";

// ─── Emitters ─────────────────────────────────────────────────────────────────

/**
 * Emit a startup verification result onto the bus.
 * Listeners: SSE streams, UI preview panel, crash-responder.
 */
export function emitVerificationResult(result: VerificationResult): void {
  bus.emit("runtime.verified", {
    projectId: result.projectId,
    outcome:   result.outcome,
    port:      result.port,
    summary:   result.summary,
    analysis:  result.analysis,
    probe:     result.probe,
    elapsedMs: result.elapsedMs,
    ts:        Date.now(),
  });

  // Also broadcast as an agent.event so the run SSE stream captures it
  bus.emit("agent.event", {
    runId:     `runtime-${result.projectId}`,
    projectId: result.projectId,
    phase:     "verification",
    eventType: `runtime.verified.${result.outcome}` as any,
    payload:   { outcome: result.outcome, port: result.port, summary: result.llmSummary },
    ts:        Date.now(),
  });
}

/**
 * Emit a periodic observation snapshot onto the bus.
 * Listeners: SSE firehose, dashboard analytics.
 */
export function emitObservationSnapshot(
  projectId: number,
  snapshot: {
    status:        string;
    errorCount:    number;
    recentErrors:  string[];
    uptimeMs:      number;
    port?:         number;
  },
): void {
  bus.emit("runtime.observation", {
    projectId,
    ts: Date.now(),
    ...snapshot,
  });
}
