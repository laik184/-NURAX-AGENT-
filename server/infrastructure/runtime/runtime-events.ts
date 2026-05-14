/**
 * runtime-events.ts
 *
 * Centralised runtime event emission for the orchestration layer.
 *
 * All runtime lifecycle events (start, stop, restart, crash) are emitted
 * through the shared event bus so SSE streams, WebSocket handlers, and
 * agent pipelines receive them via a single fan-out point.
 *
 * No direct imports from process-registry — kept stateless and pure.
 */

import { bus } from "../events/bus.ts";

// ─── Event types ──────────────────────────────────────────────────────────────

export type RuntimeEventType =
  | "process.started"
  | "process.stopped"
  | "process.restarted"
  | "process.crashed"
  | "process.error";

export interface RuntimeEventPayload {
  pid?: number;
  port?: number;
  command?: string;
  code?: number | null;
  source?: string;
  error?: string;
  message?: string;
}

// ─── Emitter ──────────────────────────────────────────────────────────────────

/**
 * Emit a runtime lifecycle event onto the shared bus.
 *
 * @param type      Event type (e.g. "process.started")
 * @param projectId Owning project
 * @param payload   Event-specific data (port, pid, exit code, …)
 */
export function emitRuntimeEvent(
  type: RuntimeEventType,
  projectId: number,
  payload: RuntimeEventPayload,
): void {
  bus.emit("agent.event", {
    runId: `runtime-${projectId}`,
    projectId,
    phase: "runtime",
    eventType: type,
    payload,
    ts: Date.now(),
  });
}

/**
 * Emit a console log line as a runtime event (stdout / stderr streaming).
 */
export function emitConsoleLog(
  projectId: number,
  stream: "stdout" | "stderr",
  line: string,
): void {
  bus.emit("console.log", { projectId, stream, line, ts: Date.now() });
}
