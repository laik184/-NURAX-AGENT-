/**
 * observation-controller.ts
 *
 * Singleton service that manages the ongoing observation lifecycle
 * for every running project.
 *
 * Responsibilities:
 *   1. Subscribe to process lifecycle events on the bus
 *   2. Start per-project observation when a server starts
 *   3. Run periodic log scans and emit observation snapshots
 *   4. Clear state when a project stops or crashes
 *
 * Ownership: runtime/controllers — orchestration, no business logic.
 * Delegates to logBuffer (read), logAnalyzer (classify), feedbackEmitter (emit).
 *
 * MAX 250 lines.
 */

import { bus, type AgentEvent } from "../../infrastructure/events/bus.ts";
import { logBuffer } from "../observer/log-buffer.ts";
import { analyzeLines } from "../observer/log-analyzer.ts";
import { emitObservationSnapshot } from "../feedback/feedback-emitter.ts";
import { runtimeManager } from "../../infrastructure/runtime/runtime-manager.ts";

// ─── Config ───────────────────────────────────────────────────────────────────

const OBSERVATION_INTERVAL_MS = 20_000; // Scan every 20s after start
const OBSERVATION_WINDOW_LINES = 50;    // Lines to inspect per scan

// ─── Per-project observation state ────────────────────────────────────────────

interface ProjectObservation {
  projectId: number;
  startedAt: number;
  timer:     NodeJS.Timeout;
}

// ─── Controller ───────────────────────────────────────────────────────────────

class ObservationController {
  private readonly projects = new Map<number, ProjectObservation>();
  private unsubscribeBus: (() => void) | null = null;

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  start(): void {
    if (this.unsubscribeBus) return;

    logBuffer.start();

    this.unsubscribeBus = bus.subscribe("agent.event", (ev: AgentEvent) => {
      if (!ev.projectId) return;
      const type = ev.eventType;

      if (type === "process.started" || type === "process.restarted") {
        const payload = ev.payload as { port?: number } | undefined;
        this.startObserving(ev.projectId, payload?.port);
      }

      if (type === "process.stopped" || type === "process.crashed") {
        this.stopObserving(ev.projectId);
      }
    });

    console.log("[observation-controller] Started — watching runtime events");
  }

  stop(): void {
    this.unsubscribeBus?.();
    this.unsubscribeBus = null;
    logBuffer.stop();

    for (const obs of this.projects.values()) {
      clearInterval(obs.timer);
    }
    this.projects.clear();

    console.log("[observation-controller] Stopped");
  }

  // ── Per-project observation ────────────────────────────────────────────────

  private startObserving(projectId: number, _port?: number): void {
    // Clear any previous observation for this project
    this.stopObserving(projectId);
    logBuffer.clear(projectId);

    const timer = setInterval(() => {
      this.scanProject(projectId);
    }, OBSERVATION_INTERVAL_MS);

    if (timer.unref) timer.unref();

    this.projects.set(projectId, {
      projectId,
      startedAt: Date.now(),
      timer,
    });
  }

  private stopObserving(projectId: number): void {
    const obs = this.projects.get(projectId);
    if (!obs) return;
    clearInterval(obs.timer);
    this.projects.delete(projectId);
  }

  // ── Scan ──────────────────────────────────────────────────────────────────

  private scanProject(projectId: number): void {
    const obs = this.projects.get(projectId);
    if (!obs) return;

    const entry    = runtimeManager.get(projectId);
    const tailLines = logBuffer.tail(projectId, OBSERVATION_WINDOW_LINES);
    const analysis  = analyzeLines(tailLines);

    const recentErrors = analysis.errors
      .slice(-5)
      .map(e => `[${e.type}] ${e.line.slice(0, 120)}`);

    emitObservationSnapshot(projectId, {
      status:       entry?.status ?? "unknown",
      errorCount:   analysis.errors.length,
      recentErrors,
      uptimeMs:     entry ? Date.now() - entry.startedAt : 0,
      port:         entry?.port,
    });

    if (analysis.hasFatalError && entry?.status === "running") {
      console.warn(
        `[observation-controller] project ${projectId} — fatal error detected in logs while process still running: ` +
        analysis.errors[0]?.line?.slice(0, 200)
      );
      // Emit a synthetic crash event so crash-responder can intervene
      bus.emit("agent.event", {
        runId:     `runtime-${projectId}`,
        projectId,
        phase:     "observation",
        eventType: "process.crashed" as any,
        payload:   { source: "observation-controller", error: analysis.errors[0]?.line },
        ts:        Date.now(),
      });
    }
  }

  // ── Query ──────────────────────────────────────────────────────────────────

  isObserving(projectId: number): boolean {
    return this.projects.has(projectId);
  }

  observedProjects(): number[] {
    return Array.from(this.projects.keys());
  }
}

export const observationController = new ObservationController();
