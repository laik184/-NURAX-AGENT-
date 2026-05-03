import type {
  ProjectStructure,
  HVPComplianceReport,
  Violation,
  LayerReport,
  ViolationSeverity,
  HVPAnalysisSession,
  LayerDefinition,
  FileNode,
} from "./types.js";
import {
  SCORE_DEDUCTIONS,
  MAX_REPORT_VIOLATIONS,
  HVP_DEFAULT_LAYERS,
} from "./types.js";
import * as state from "./state.js";

import { validateLayerStructure }
  from "./validators/layer-structure.validator.js";
import { validateImportDirection }
  from "./validators/import-direction.validator.js";
import { validateCrossLayerImports }
  from "./validators/cross-layer.validator.js";
import { validateOrchestratorRules }
  from "./validators/orchestrator-rule.validator.js";
import { validateStateIsolation }
  from "./validators/state-isolation.validator.js";

import { buildImportGraph } from "./utils/import-graph.builder.util.js";

let _reportCounter = 0;

function nextReportId(): string {
  _reportCounter += 1;
  return `hvp-${Date.now()}-${String(_reportCounter).padStart(4, "0")}`;
}

function countBySeverity(
  violations: readonly Violation[],
  severity:   ViolationSeverity,
): number {
  return violations.filter((v) => v.severity === severity).length;
}

function computeScore(violations: readonly Violation[]): number {
  let score = 100;
  for (const v of violations) {
    score -= SCORE_DEDUCTIONS[v.severity] ?? 0;
  }
  return Math.max(0, score);
}

function buildLayerReports(
  files:       readonly FileNode[],
  definitions: readonly LayerDefinition[],
  violations:  readonly Violation[],
): readonly LayerReport[] {
  return Object.freeze(
    definitions.map((def) => {
      const layerFiles = files.filter((f) => f.layer === def.level);
      const layerPaths = new Set(layerFiles.map((f) => f.path));
      const layerViolations = violations.filter(
        (v) => layerPaths.has(v.file) || layerPaths.has(v.importedFile),
      );
      return Object.freeze({
        level:      def.level,
        name:       def.name,
        fileCount:  layerFiles.length,
        violations: layerViolations.length,
        compliant:  layerViolations.length === 0,
        files:      Object.freeze(layerFiles.map((f) => f.path)),
      });
    }),
  );
}

function buildSummary(
  score:         number,
  totalFiles:    number,
  totalViolations: number,
  criticalCount: number,
): string {
  if (totalFiles === 0) return "No files provided for analysis.";
  if (totalViolations === 0) return `HVP fully compliant — ${totalFiles} files, score: ${score}/100.`;
  const severity = criticalCount > 0 ? "CRITICAL violations detected" : "Non-critical violations detected";
  return `${severity} — score: ${score}/100. ${totalViolations} violation(s) across ${totalFiles} files.`;
}

function isValidProject(project: unknown): project is ProjectStructure {
  if (!project || typeof project !== "object" || Array.isArray(project)) return false;
  const p = project as Record<string, unknown>;
  return (
    typeof p["projectId"] === "string" &&
    Array.isArray(p["files"]) &&
    Array.isArray(p["layerDefinitions"])
  );
}

function createSession(projectId: string, fileCount: number): HVPAnalysisSession {
  return Object.freeze({
    sessionId:   `sess-${Date.now()}`,
    projectId,
    phase:       "IDLE" as const,
    startedAt:   Date.now(),
    completedAt: 0,
    fileCount,
  });
}

export function analyzeHVP(project: ProjectStructure): HVPComplianceReport {
  const nowMs    = Date.now();
  const reportId = nextReportId();

  if (!isValidProject(project)) {
    const empty = Object.freeze({
      reportId,
      analyzedAt:       nowMs,
      isCompliant:      false,
      complianceScore:  0,
      totalFiles:       0,
      totalViolations:  0,
      criticalCount:    0,
      highCount:        0,
      mediumCount:      0,
      lowCount:         0,
      violations:       Object.freeze([]),
      layerReports:     Object.freeze([]),
      summary:          "Invalid ProjectStructure — missing required fields",
    });
    state.setLastReport(empty);
    return empty;
  }

  const { files, layerDefinitions, projectId } = project;
  const defs = layerDefinitions.length > 0 ? layerDefinitions : HVP_DEFAULT_LAYERS;

  const session = createSession(projectId, files.length);
  state.setSession(session);

  state.updatePhase("LAYER_STRUCTURE");
  const r1 = validateLayerStructure(files, defs, nowMs);

  state.updatePhase("IMPORT_DIRECTION");
  const r2 = validateImportDirection(files, defs, nowMs);

  state.updatePhase("CROSS_LAYER");
  const r3 = validateCrossLayerImports(files, defs, nowMs);

  state.updatePhase("ORCHESTRATOR_RULE");
  const r4 = validateOrchestratorRules(files, defs, nowMs);

  state.updatePhase("STATE_ISOLATION");
  const r5 = validateStateIsolation(files, defs, nowMs);

  const graph = buildImportGraph(files, defs, nowMs);
  state.setImportGraph(graph);

  const allViolations: Violation[] = [
    ...r1.violations,
    ...r2.violations,
    ...r3.violations,
    ...r4.violations,
    ...r5.violations,
  ].slice(0, MAX_REPORT_VIOLATIONS);

  const score         = computeScore(allViolations);
  const criticalCount = countBySeverity(allViolations, "CRITICAL");
  const highCount     = countBySeverity(allViolations, "HIGH");
  const mediumCount   = countBySeverity(allViolations, "MEDIUM");
  const lowCount      = countBySeverity(allViolations, "LOW");
  const layerReports  = buildLayerReports(files, defs, allViolations);

  state.updatePhase("COMPLETE");
  state.markComplete(Date.now());

  const report: HVPComplianceReport = Object.freeze({
    reportId,
    analyzedAt:      nowMs,
    isCompliant:     allViolations.length === 0,
    complianceScore: score,
    totalFiles:      files.length,
    totalViolations: allViolations.length,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    violations:      Object.freeze(allViolations),
    layerReports,
    summary:         buildSummary(score, files.length, allViolations.length, criticalCount),
  });

  state.setLastReport(report);
  return report;
}

export function analyzeMultiple(
  projects: readonly ProjectStructure[],
): readonly HVPComplianceReport[] {
  if (!Array.isArray(projects) || projects.length === 0) {
    return Object.freeze([]);
  }
  return Object.freeze(projects.map((p) => analyzeHVP(p)));
}

export function getLastReport(): Readonly<HVPComplianceReport> | null {
  return state.getLastReport();
}

export function getReportHistory(): readonly HVPComplianceReport[] {
  return state.getReportHistory();
}

export function resetAnalyzer(): void {
  _reportCounter = 0;
  state.clearAll();
}
