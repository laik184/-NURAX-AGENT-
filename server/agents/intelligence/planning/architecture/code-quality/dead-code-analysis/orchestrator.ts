import type {
  CodeFile,
  DeadCodeReport,
  DeadCodeSession,
} from "./types.js";
import * as state from "./state.js";

import { detectUnusedExports } from "./agents/unused-exports.detector.agent.js";
import { detectOrphanFiles }   from "./agents/orphan-file.detector.agent.js";
import { scanUnreachableCode } from "./agents/unreachable-code.scanner.agent.js";
import { compileDeadCodeReport } from "./agents/dead-code-reporter.agent.js";

let _reportCounter = 0;

function nextReportId(): string {
  _reportCounter += 1;
  return `dead-${Date.now()}-${String(_reportCounter).padStart(4, "0")}`;
}

function nextSessionId(): string {
  return `deadsess-${Date.now()}`;
}

function buildEmptyReport(reportId: string, nowMs: number): DeadCodeReport {
  return Object.freeze({
    reportId,
    analyzedAt:              nowMs,
    totalFiles:              0,
    totalIssues:             0,
    issues:                  Object.freeze([]),
    unusedExportIssueCount:  0,
    orphanIssueCount:        0,
    unreachableIssueCount:   0,
    criticalCount:           0,
    highCount:               0,
    mediumCount:             0,
    lowCount:                0,
    overallScore:            100,
    isHealthy:               true,
    summary:                 "No files provided for dead code analysis.",
  });
}

function createSession(fileCount: number): DeadCodeSession {
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

export function analyzeDeadCode(
  files: readonly CodeFile[],
): DeadCodeReport {
  const nowMs    = Date.now();
  const reportId = nextReportId();

  if (!isValidInput(files) || files.length === 0) {
    const r = buildEmptyReport(reportId, nowMs);
    state.setLastReport(r);
    return r;
  }

  const session = createSession(files.length);
  state.setSession(session);

  state.updatePhase("UNUSED_EXPORTS_SCAN");
  const unusedExportResult = detectUnusedExports(files);

  state.updatePhase("ORPHAN_DETECTION");
  const orphanResult = detectOrphanFiles(files);

  state.updatePhase("UNREACHABLE_CODE_SCAN");
  const unreachableResult = scanUnreachableCode(files);

  state.setIntermediateIssues(Object.freeze({
    unusedExportIssues: unusedExportResult.issues,
    orphanIssues:       orphanResult.issues,
    unreachableIssues:  unreachableResult.issues,
    builtAt:            Date.now(),
  }));

  state.updatePhase("REPORT_GENERATION");
  const report = compileDeadCodeReport(
    reportId,
    nowMs,
    files.length,
    unusedExportResult.issues,
    orphanResult.issues,
    unreachableResult.issues,
  );

  state.updatePhase("COMPLETE");
  state.markComplete();
  state.setLastReport(report);

  return report;
}

export function analyzeDeadCodeMultiple(
  fileGroups: readonly (readonly CodeFile[])[],
): readonly DeadCodeReport[] {
  if (!Array.isArray(fileGroups) || fileGroups.length === 0) {
    return Object.freeze<DeadCodeReport[]>([]);
  }
  return Object.freeze(fileGroups.map(analyzeDeadCode));
}

export function getLastReport(): Readonly<DeadCodeReport> | null {
  return state.getLastReport();
}

export function getReportHistory(): readonly DeadCodeReport[] {
  return state.getReportHistory();
}

export function resetAnalyzer(): void {
  _reportCounter = 0;
  state.clearAll();
}
