import type {
  CodeFile,
  ObservabilityReport,
  ObservabilitySession,
} from "./types.js";
import * as state from "./state.js";

import { analyzeLoggingConsistency } from "./agents/logging-consistency.analyzer.agent.js";
import { analyzeErrorHandling }      from "./agents/error-handling.coverage.agent.js";
import { detectMonitoringHooks }     from "./agents/monitoring-hooks.detector.agent.js";
import { compileObservabilityReport } from "./agents/observability-reporter.agent.js";

let _reportCounter = 0;

function nextReportId(): string {
  _reportCounter += 1;
  return `obs-${Date.now()}-${String(_reportCounter).padStart(4, "0")}`;
}

function nextSessionId(): string {
  return `obsess-${Date.now()}`;
}

function buildEmptyReport(reportId: string, nowMs: number): ObservabilityReport {
  return Object.freeze({
    reportId,
    analyzedAt:               nowMs,
    totalFiles:               0,
    totalIssues:              0,
    issues:                   Object.freeze([]),
    loggingIssueCount:        0,
    errorHandlingIssueCount:  0,
    monitoringIssueCount:     0,
    criticalCount:            0,
    highCount:                0,
    mediumCount:              0,
    lowCount:                 0,
    overallScore:             100,
    isHealthy:                true,
    summary:                  "No files provided for observability analysis.",
  });
}

function createSession(fileCount: number): ObservabilitySession {
  return Object.freeze({
    sessionId:  nextSessionId(),
    phase:      "IDLE" as const,
    startedAt:  Date.now(),
    fileCount,
  });
}

function isValidFile(f: unknown): f is CodeFile {
  if (!f || typeof f !== "object" || Array.isArray(f)) return false;
  const obj = f as Record<string, unknown>;
  return (
    typeof obj["id"]      === "string" &&
    typeof obj["path"]    === "string" &&
    typeof obj["content"] === "string"
  );
}

function isValidInput(files: unknown): files is readonly CodeFile[] {
  return Array.isArray(files) && files.every(isValidFile);
}

export function analyzeObservability(
  files: readonly CodeFile[],
): ObservabilityReport {
  const nowMs    = Date.now();
  const reportId = nextReportId();

  if (!isValidInput(files) || files.length === 0) {
    const r = buildEmptyReport(reportId, nowMs);
    state.setLastReport(r);
    return r;
  }

  const session = createSession(files.length);
  state.setSession(session);

  state.updatePhase("LOGGING_ANALYSIS");
  const loggingResult = analyzeLoggingConsistency(files);

  state.updatePhase("ERROR_COVERAGE");
  const errorResult = analyzeErrorHandling(files);

  state.updatePhase("MONITORING_DETECTION");
  const monitoringResult = detectMonitoringHooks(files);

  state.setIntermediateIssues(Object.freeze({
    loggingIssues:    loggingResult.issues,
    errorIssues:      errorResult.issues,
    monitoringIssues: monitoringResult.issues,
    builtAt:          Date.now(),
  }));

  state.updatePhase("REPORT_GENERATION");
  const report = compileObservabilityReport(
    reportId,
    nowMs,
    files.length,
    loggingResult.issues,
    errorResult.issues,
    monitoringResult.issues,
  );

  state.updatePhase("COMPLETE");
  state.markComplete();
  state.setLastReport(report);

  return report;
}

export function analyzeObservabilityMultiple(
  fileGroups: readonly (readonly CodeFile[])[],
): readonly ObservabilityReport[] {
  if (!Array.isArray(fileGroups) || fileGroups.length === 0) {
    return Object.freeze<ObservabilityReport[]>([]);
  }
  return Object.freeze(fileGroups.map(analyzeObservability));
}

export function getLastReport(): Readonly<ObservabilityReport> | null {
  return state.getLastReport();
}

export function getReportHistory(): readonly ObservabilityReport[] {
  return state.getReportHistory();
}

export function resetAnalyzer(): void {
  _reportCounter = 0;
  state.clearAll();
}
