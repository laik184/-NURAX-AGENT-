import type {
  CodeFile,
  TestArchReport,
  TestArchSession,
} from "./types.js";
import * as state from "./state.js";

import { mapCoverageGaps }       from "./agents/coverage-gap.mapper.agent.js";
import { analyzeTestLayers }     from "./agents/test-layer.analyzer.agent.js";
import { analyzeTestRatio }      from "./agents/test-ratio.analyzer.agent.js";
import { compileTestArchReport } from "./agents/test-arch-reporter.agent.js";

let _reportCounter = 0;

function nextReportId(): string {
  _reportCounter += 1;
  return `tarch-${Date.now()}-${String(_reportCounter).padStart(4, "0")}`;
}

function nextSessionId(): string {
  return `tarchsess-${Date.now()}`;
}

function buildEmptyReport(reportId: string, nowMs: number): TestArchReport {
  return Object.freeze({
    reportId,
    analyzedAt:          nowMs,
    totalFiles:          0,
    totalIssues:         0,
    issues:              Object.freeze([]),
    coverageIssueCount:  0,
    layerIssueCount:     0,
    ratioIssueCount:     0,
    criticalCount:       0,
    highCount:           0,
    mediumCount:         0,
    lowCount:            0,
    testToCodeRatio:     1,
    overallScore:        100,
    isHealthy:           true,
    summary:             "No files provided for test architecture analysis.",
  });
}

function createSession(fileCount: number): TestArchSession {
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

export function analyzeTestArchitecture(
  files: readonly CodeFile[],
): TestArchReport {
  const nowMs    = Date.now();
  const reportId = nextReportId();

  if (!isValidInput(files) || files.length === 0) {
    const r = buildEmptyReport(reportId, nowMs);
    state.setLastReport(r);
    return r;
  }

  const session = createSession(files.length);
  state.setSession(session);

  state.updatePhase("COVERAGE_GAP_MAPPING");
  const coverageResult = mapCoverageGaps(files);

  state.updatePhase("LAYER_ANALYSIS");
  const layerResult = analyzeTestLayers(files);

  state.updatePhase("RATIO_ANALYSIS");
  const ratioResult = analyzeTestRatio(files);

  state.setIntermediateIssues(Object.freeze({
    coverageIssues: coverageResult.issues,
    layerIssues:    layerResult.issues,
    ratioIssues:    ratioResult.issues,
    builtAt:        Date.now(),
  }));

  state.updatePhase("REPORT_GENERATION");
  const report = compileTestArchReport(
    reportId,
    nowMs,
    files.length,
    ratioResult.testToCodeRatio,
    coverageResult.issues,
    layerResult.issues,
    ratioResult.issues,
  );

  state.updatePhase("COMPLETE");
  state.markComplete();
  state.setLastReport(report);

  return report;
}

export function analyzeTestArchitectureMultiple(
  fileGroups: readonly (readonly CodeFile[])[],
): readonly TestArchReport[] {
  if (!Array.isArray(fileGroups) || fileGroups.length === 0) {
    return Object.freeze<TestArchReport[]>([]);
  }
  return Object.freeze(fileGroups.map(analyzeTestArchitecture));
}

export function getLastReport(): Readonly<TestArchReport> | null {
  return state.getLastReport();
}

export function getReportHistory(): readonly TestArchReport[] {
  return state.getReportHistory();
}

export function resetAnalyzer(): void {
  _reportCounter = 0;
  state.clearAll();
}
