import type {
  ProjectFiles,
  ResponsibilityReport,
  ResponsibilitySession,
  IntermediateAnalysis,
  FileDescriptor,
} from "./types.js";
import { MAX_VIOLATIONS }          from "./types.js";
import * as state                  from "./state.js";

import { detectConcerns }          from "./agents/concern-detector.agent.js";
import { detectMultipleResponsibilities }
  from "./agents/multi-responsibility.detector.agent.js";
import { calculateSRPScores, overallSRPScore, compliantFileCount }
  from "./agents/srp-score.calculator.agent.js";
import { evaluatePurity, modulePurityScore }
  from "./agents/purity-evaluator.agent.js";

let _reportCounter = 0;

function nextReportId(): string {
  _reportCounter += 1;
  return `resp-${Date.now()}-${String(_reportCounter).padStart(4, "0")}`;
}

function nextSessionId(): string {
  return `sess-${Date.now()}`;
}

function isValidProject(p: unknown): p is ProjectFiles {
  if (!p || typeof p !== "object" || Array.isArray(p)) return false;
  const proj = p as Record<string, unknown>;
  return typeof proj["projectId"] === "string" && Array.isArray(proj["files"]);
}

function createSession(projectId: string, fileCount: number): ResponsibilitySession {
  return Object.freeze({
    sessionId: nextSessionId(),
    projectId,
    phase:     "IDLE" as const,
    startedAt: Date.now(),
    fileCount,
  });
}

function buildSummary(
  totalFiles:   number,
  violations:   number,
  srpScore:     number,
  purityScore:  number,
  critical:     number,
): string {
  if (totalFiles === 0) return "No files provided for analysis.";
  if (violations === 0) {
    return `All ${totalFiles} files comply with SRP. SRP score: ${srpScore}/100. Purity: ${purityScore}/100.`;
  }
  const critPart = critical > 0 ? ` ${critical} critical violation(s).` : "";
  return `${violations} SRP violation(s) across ${totalFiles} files.${critPart} SRP score: ${srpScore}/100. Purity: ${purityScore}/100.`;
}

function buildEmptyReport(reportId: string, nowMs: number): ResponsibilityReport {
  return Object.freeze({
    reportId,
    analyzedAt:        nowMs,
    totalFiles:        0,
    totalViolations:   0,
    violations:        Object.freeze([]),
    srpScores:         Object.freeze([]),
    purityScores:      Object.freeze([]),
    overallSRPScore:   100,
    modulePurityScore: 100,
    compliantFiles:    0,
    violatingFiles:    0,
    criticalCount:     0,
    summary:           "No files provided for analysis.",
  });
}

function buildInvalidReport(reportId: string, nowMs: number): ResponsibilityReport {
  return Object.freeze({
    reportId,
    analyzedAt:        nowMs,
    totalFiles:        0,
    totalViolations:   0,
    violations:        Object.freeze([]),
    srpScores:         Object.freeze([]),
    purityScores:      Object.freeze([]),
    overallSRPScore:   0,
    modulePurityScore: 0,
    compliantFiles:    0,
    violatingFiles:    0,
    criticalCount:     0,
    summary:           "Invalid ProjectFiles — missing required fields.",
  });
}

export function analyzeResponsibility(project: ProjectFiles): ResponsibilityReport {
  const nowMs    = Date.now();
  const reportId = nextReportId();

  if (!isValidProject(project)) {
    const r = buildInvalidReport(reportId, nowMs);
    state.setLastReport(r);
    return r;
  }

  const { files, projectId } = project;

  if (files.length === 0) {
    const r = buildEmptyReport(reportId, nowMs);
    state.setLastReport(r);
    return r;
  }

  const session = createSession(projectId, files.length);
  state.setSession(session);

  state.updatePhase("CONCERN_DETECTION");
  const concerns = detectConcerns(files);

  const intermediate: IntermediateAnalysis = Object.freeze({
    concerns,
    builtAt: Date.now(),
  });
  state.setIntermediateAnalysis(intermediate);

  state.updatePhase("MULTI_RESPONSIBILITY");
  const rawViolations = detectMultipleResponsibilities(files, concerns);
  const violations    = rawViolations.slice(0, MAX_VIOLATIONS);

  state.updatePhase("SRP_SCORING");
  const srpScores  = calculateSRPScores(files, concerns, violations);
  const srpScore   = overallSRPScore(srpScores);
  const compliant  = compliantFileCount(srpScores);

  state.updatePhase("PURITY_EVALUATION");
  const purityScores = evaluatePurity(files, concerns);
  const purityScore  = modulePurityScore(purityScores);

  const criticalCount  = violations.filter((v) => v.severity === "CRITICAL").length;
  const violatingFiles = files.length - compliant;

  state.updatePhase("COMPLETE");
  state.markComplete();

  const report: ResponsibilityReport = Object.freeze({
    reportId,
    analyzedAt:        nowMs,
    totalFiles:        files.length,
    totalViolations:   violations.length,
    violations:        Object.freeze(violations),
    srpScores:         Object.freeze(srpScores),
    purityScores:      Object.freeze(purityScores),
    overallSRPScore:   srpScore,
    modulePurityScore: purityScore,
    compliantFiles:    compliant,
    violatingFiles,
    criticalCount,
    summary:           buildSummary(files.length, violations.length, srpScore, purityScore, criticalCount),
  });

  state.setLastReport(report);
  return report;
}

export function analyzeMultiple(
  projects: readonly ProjectFiles[],
): readonly ResponsibilityReport[] {
  if (!Array.isArray(projects) || projects.length === 0) {
    return Object.freeze<ResponsibilityReport[]>([]);
  }
  return Object.freeze(projects.map(analyzeResponsibility));
}

export function getLastReport(): Readonly<ResponsibilityReport> | null {
  return state.getLastReport();
}

export function getReportHistory(): readonly ResponsibilityReport[] {
  return state.getReportHistory();
}

export function resetAnalyzer(): void {
  _reportCounter = 0;
  state.clearAll();
}
