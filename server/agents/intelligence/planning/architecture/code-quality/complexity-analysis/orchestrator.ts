import type {
  CodeFile,
  ComplexityReport,
  ComplexitySession,
} from "./types.js";
import * as state from "./state.js";

import { scoreCyclomaticComplexity } from "./agents/cyclomatic.scorer.agent.js";
import { scoreCognitiveComplexity }  from "./agents/cognitive.scorer.agent.js";
import { analyzeFunctionLength }     from "./agents/function-length.analyzer.agent.js";
import { analyzeNestingDepth }       from "./agents/nesting-depth.analyzer.agent.js";
import { compileComplexityReport }   from "./agents/complexity-reporter.agent.js";

let _reportCounter = 0;

function nextReportId(): string {
  _reportCounter += 1;
  return `cx-${Date.now()}-${String(_reportCounter).padStart(4, "0")}`;
}

function nextSessionId(): string {
  return `cxsess-${Date.now()}`;
}

function buildEmptyReport(reportId: string, nowMs: number): ComplexityReport {
  return Object.freeze({
    reportId,
    analyzedAt:                  nowMs,
    totalFiles:                  0,
    totalIssues:                 0,
    issues:                      Object.freeze([]),
    cyclomaticIssueCount:        0,
    cognitiveIssueCount:         0,
    functionLengthIssueCount:    0,
    nestingIssueCount:           0,
    criticalCount:               0,
    highCount:                   0,
    mediumCount:                 0,
    lowCount:                    0,
    avgCyclomaticComplexity:     0,
    maxCyclomaticComplexity:     0,
    avgCognitiveComplexity:      0,
    maxNestingDepth:             0,
    overallScore:                100,
    isHealthy:                   true,
    summary:                     "No files provided for complexity analysis.",
  });
}

function createSession(fileCount: number): ComplexitySession {
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

export function analyzeComplexity(
  files: readonly CodeFile[],
): ComplexityReport {
  const nowMs    = Date.now();
  const reportId = nextReportId();

  if (!isValidInput(files) || files.length === 0) {
    const r = buildEmptyReport(reportId, nowMs);
    state.setLastReport(r);
    return r;
  }

  const session = createSession(files.length);
  state.setSession(session);

  state.updatePhase("CYCLOMATIC_SCORING");
  const cyclomaticResult = scoreCyclomaticComplexity(files);

  state.updatePhase("COGNITIVE_SCORING");
  const cognitiveResult = scoreCognitiveComplexity(files);

  state.updatePhase("FUNCTION_LENGTH_ANALYSIS");
  const lengthResult = analyzeFunctionLength(files);

  state.updatePhase("NESTING_DEPTH_ANALYSIS");
  const nestingResult = analyzeNestingDepth(files);

  state.setIntermediateIssues(Object.freeze({
    cyclomaticIssues:     cyclomaticResult.issues,
    cognitiveIssues:      cognitiveResult.issues,
    functionLengthIssues: lengthResult.issues,
    nestingIssues:        nestingResult.issues,
    builtAt:              Date.now(),
  }));

  state.updatePhase("REPORT_GENERATION");
  const report = compileComplexityReport(
    reportId,
    nowMs,
    files.length,
    cyclomaticResult.issues,
    cognitiveResult.issues,
    lengthResult.issues,
    nestingResult.issues,
    cyclomaticResult.avgComplexity,
    cognitiveResult.avgCognitive,
    cyclomaticResult.maxComplexity,
    nestingResult.maxDepth,
  );

  state.updatePhase("COMPLETE");
  state.markComplete();
  state.setLastReport(report);

  return report;
}

export function analyzeComplexityMultiple(
  fileGroups: readonly (readonly CodeFile[])[],
): readonly ComplexityReport[] {
  if (!Array.isArray(fileGroups) || fileGroups.length === 0) {
    return Object.freeze<ComplexityReport[]>([]);
  }
  return Object.freeze(fileGroups.map(analyzeComplexity));
}

export function getLastReport(): Readonly<ComplexityReport> | null {
  return state.getLastReport();
}

export function getReportHistory(): readonly ComplexityReport[] {
  return state.getReportHistory();
}

export function resetAnalyzer(): void {
  _reportCounter = 0;
  state.clearAll();
}
