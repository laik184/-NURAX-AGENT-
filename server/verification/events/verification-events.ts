/**
 * verification-events.ts
 *
 * Emit verification lifecycle events onto the shared bus.
 *
 * Subscribers: SSE streams (frontend status indicators), agent event log.
 * Ownership: verification/events — emit only, no logic.
 */

import { bus } from "../../infrastructure/events/bus.ts";
import type { VerificationReport } from "../types.ts";

export function emitVerificationStarted(projectId: number, runId: string): void {
  bus.emit("agent.event", {
    runId,
    projectId,
    phase:     "verification",
    eventType: "verification.started" as any,
    payload:   { projectId },
    ts:        Date.now(),
  });
}

export function emitVerificationPassed(report: VerificationReport): void {
  bus.emit("agent.event", {
    runId:     report.runId,
    projectId: report.projectId,
    phase:     "verification",
    eventType: "verification.passed" as any,
    payload:   {
      projectId: report.projectId,
      checks:    report.checks.length,
      elapsedMs: report.elapsedMs,
    },
    ts: Date.now(),
  });
}

export function emitVerificationFailed(report: VerificationReport, attempt: number): void {
  bus.emit("agent.event", {
    runId:     report.runId,
    projectId: report.projectId,
    phase:     "verification",
    eventType: "verification.failed" as any,
    payload:   {
      projectId:       report.projectId,
      attempt,
      issues:          report.issues,
      requiredActions: report.requiredActions,
      checks:          report.checks.map(c => ({ name: c.name, status: c.status, message: c.message })),
    },
    ts: Date.now(),
  });
}

export function emitVerificationExhausted(projectId: number, runId: string, maxRetries: number): void {
  bus.emit("agent.event", {
    runId,
    projectId,
    phase:     "verification",
    eventType: "verification.exhausted" as any,
    payload:   { projectId, maxRetries, warning: "Verification max retries reached — completing with warnings" },
    ts:        Date.now(),
  });
}
