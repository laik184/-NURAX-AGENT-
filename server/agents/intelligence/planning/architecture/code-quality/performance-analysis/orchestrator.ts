import type {
  CodeFile,
  PerformanceReport,
  PerformanceSession,
} from "./types.js";
import * as state from "./state.js";

import { detectN1Queries }     from "./agents/n1-query.detector.agent.js";
import { detectMemoryLeaks }   from "./agents/memory-leak.detector.agent.js";
import { detectAsyncMisuse }   from "./agents/async-misuse.detector.agent.js";
import { analyzeDbHotspots }   from "./agents/db-hotspot.analyzer.agent.js";
import { compilePerformanceReport } from "./agents/performance-reporter.agent.js";

let _reportCounter = 0;

function nextReportId(): string {
  _reportCounter += 1;
  return `perf-${Date.now()}-${String(_reportCounter).padStart(4, "0")}`;
}

function nextSessionId(): string {
  return `psess-${Date.now()}`;
}

function buildEmptyReport(reportId: string, nowMs: number): PerformanceReport {
  return Object.freeze({
    reportId,
    analyzedAt:        nowMs,
    totalFiles:        0,
    totalIssues:       0,
    issues:            Object.freeze([]),
    n1Count:           0,
    memoryLeakCount:   0,
    asyncMisuseCount:  0,
    dbHotspotCount:    0,
    criticalCount:     0,
    highCount:         0,
    mediumCount:       0,
    lowCount:          0,
    overallScore:      100,
    isPerformant:      true,
    summary:           "No files provided for performance analysis.",
  });
}

function createSession(fileCount: number): PerformanceSession {
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

export function analyzePerformance(
  files: readonly CodeFile[],
): PerformanceReport {
  const nowMs    = Date.now();
  const reportId = nextReportId();

  if (!isValidInput(files) || files.length === 0) {
    const r = buildEmptyReport(reportId, nowMs);
    state.setLastReport(r);
    return r;
  }

  const session = createSession(files.length);
  state.setSession(session);

  state.updatePhase("N1_DETECTION");
  const n1Result = detectN1Queries(files);

  state.updatePhase("MEMORY_LEAK_DETECTION");
  const memResult = detectMemoryLeaks(files);

  state.updatePhase("ASYNC_ANALYSIS");
  const asyncResult = detectAsyncMisuse(files);

  state.updatePhase("DB_HOTSPOT_ANALYSIS");
  const dbResult = analyzeDbHotspots(files);

  state.setIntermediateIssues(Object.freeze({
    n1Issues:        n1Result.issues,
    memoryIssues:    memResult.issues,
    asyncIssues:     asyncResult.issues,
    dbHotspotIssues: dbResult.issues,
    builtAt:         Date.now(),
  }));

  state.updatePhase("REPORT_GENERATION");
  const report = compilePerformanceReport(
    reportId,
    nowMs,
    files.length,
    n1Result.issues,
    memResult.issues,
    asyncResult.issues,
    dbResult.issues,
  );

  state.updatePhase("COMPLETE");
  state.markComplete();
  state.setLastReport(report);

  return report;
}

export function analyzeMultipleProjects(
  fileGroups: readonly (readonly CodeFile[])[],
): readonly PerformanceReport[] {
  if (!Array.isArray(fileGroups) || fileGroups.length === 0) {
    return Object.freeze<PerformanceReport[]>([]);
  }
  return Object.freeze(fileGroups.map(analyzePerformance));
}

export function getLastReport(): Readonly<PerformanceReport> | null {
  return state.getLastReport();
}

export function getReportHistory(): readonly PerformanceReport[] {
  return state.getReportHistory();
}

export function resetAnalyzer(): void {
  _reportCounter = 0;
  state.clearAll();
}
