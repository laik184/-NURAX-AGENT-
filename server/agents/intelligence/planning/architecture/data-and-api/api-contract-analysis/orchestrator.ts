import type {
  CodeFile,
  ApiContractReport,
  ApiContractSession,
  VersioningStrategy,
} from "./types.js";
import * as state from "./state.js";

import { analyzeEndpointConsistency }  from "./agents/endpoint-consistency.analyzer.agent.js";
import { validateSchemas }             from "./agents/schema.validator.agent.js";
import { checkVersioning }             from "./agents/versioning.checker.agent.js";
import { detectBreakingChanges }       from "./agents/breaking-change.detector.agent.js";
import { compileContractReport }       from "./agents/contract-reporter.agent.js";

let _reportCounter = 0;

function nextReportId(): string {
  _reportCounter += 1;
  return `api-${Date.now()}-${String(_reportCounter).padStart(4, "0")}`;
}

function nextSessionId(): string {
  return `acsess-${Date.now()}`;
}

function buildEmptyReport(reportId: string, nowMs: number): ApiContractReport {
  return Object.freeze({
    reportId,
    analyzedAt:             nowMs,
    totalFiles:             0,
    totalEndpoints:         0,
    totalIssues:            0,
    issues:                 Object.freeze([]),
    consistencyCount:       0,
    schemaViolationCount:   0,
    versioningIssueCount:   0,
    breakingChangeCount:    0,
    criticalCount:          0,
    highCount:              0,
    mediumCount:            0,
    lowCount:               0,
    versioningStrategy:     "NONE" as VersioningStrategy,
    overallScore:           100,
    isCompliant:            true,
    summary:                "No files provided for API contract analysis.",
  });
}

function createSession(fileCount: number): ApiContractSession {
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
  return typeof obj["id"] === "string" && typeof obj["path"] === "string" && typeof obj["content"] === "string";
}

function isValidInput(files: unknown): files is readonly CodeFile[] {
  return Array.isArray(files) && files.every(isValidFile);
}

export function analyzeApiContract(
  files: readonly CodeFile[],
): ApiContractReport {
  const nowMs    = Date.now();
  const reportId = nextReportId();

  if (!isValidInput(files) || files.length === 0) {
    const r = buildEmptyReport(reportId, nowMs);
    state.setLastReport(r);
    return r;
  }

  const session = createSession(files.length);
  state.setSession(session);

  state.updatePhase("ENDPOINT_CONSISTENCY");
  const consistencyResult = analyzeEndpointConsistency(files);
  const allEndpoints      = consistencyResult.endpoints;

  state.updatePhase("SCHEMA_VALIDATION");
  const schemaResult = validateSchemas(files, allEndpoints);

  state.updatePhase("VERSIONING_CHECK");
  const versioningResult = checkVersioning(files, allEndpoints);

  state.updatePhase("BREAKING_CHANGE_DETECTION");
  const breakingResult = detectBreakingChanges(files, allEndpoints);

  state.setIntermediateIssues(Object.freeze({
    consistencyIssues:  consistencyResult.issues,
    schemaIssues:       schemaResult.issues,
    versioningIssues:   versioningResult.issues,
    breakingIssues:     breakingResult.issues,
    builtAt:            Date.now(),
  }));

  state.updatePhase("REPORT_GENERATION");
  const report = compileContractReport(
    reportId,
    nowMs,
    files.length,
    consistencyResult.endpointsFound,
    consistencyResult.issues,
    schemaResult.issues,
    versioningResult.issues,
    breakingResult.issues,
    versioningResult.strategy,
  );

  state.updatePhase("COMPLETE");
  state.markComplete();
  state.setLastReport(report);

  return report;
}

export function analyzeApiContractMultiple(
  fileGroups: readonly (readonly CodeFile[])[],
): readonly ApiContractReport[] {
  if (!Array.isArray(fileGroups) || fileGroups.length === 0) {
    return Object.freeze<ApiContractReport[]>([]);
  }
  return Object.freeze(fileGroups.map(analyzeApiContract));
}

export function getLastReport(): Readonly<ApiContractReport> | null {
  return state.getLastReport();
}

export function getReportHistory(): readonly ApiContractReport[] {
  return state.getReportHistory();
}

export function resetAnalyzer(): void {
  _reportCounter = 0;
  state.clearAll();
}
