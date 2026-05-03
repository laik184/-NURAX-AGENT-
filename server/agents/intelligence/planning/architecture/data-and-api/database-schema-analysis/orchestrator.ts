import type {
  CodeFile,
  DbSchemaReport,
  DbSchemaSession,
} from "./types.js";
import * as state from "./state.js";

import { validateSchemaDesign }  from "./agents/schema-design.validator.agent.js";
import { trackMigrations }       from "./agents/migration-tracking.agent.js";
import { detectOrmMisuse }       from "./agents/orm-misuse.detector.agent.js";
import { compileDbSchemaReport } from "./agents/db-schema-reporter.agent.js";

let _reportCounter = 0;

function nextReportId(): string {
  _reportCounter += 1;
  return `db-${Date.now()}-${String(_reportCounter).padStart(4, "0")}`;
}

function nextSessionId(): string {
  return `dbsess-${Date.now()}`;
}

function buildEmptyReport(reportId: string, nowMs: number): DbSchemaReport {
  return Object.freeze({
    reportId,
    analyzedAt:           nowMs,
    totalFiles:           0,
    totalIssues:          0,
    issues:               Object.freeze([]),
    schemaIssueCount:     0,
    migrationIssueCount:  0,
    ormIssueCount:        0,
    criticalCount:        0,
    highCount:            0,
    mediumCount:          0,
    lowCount:             0,
    overallScore:         100,
    isHealthy:            true,
    summary:              "No files provided for database schema analysis.",
  });
}

function createSession(fileCount: number): DbSchemaSession {
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

export function analyzeDbSchema(
  files: readonly CodeFile[],
): DbSchemaReport {
  const nowMs    = Date.now();
  const reportId = nextReportId();

  if (!isValidInput(files) || files.length === 0) {
    const r = buildEmptyReport(reportId, nowMs);
    state.setLastReport(r);
    return r;
  }

  const session = createSession(files.length);
  state.setSession(session);

  state.updatePhase("SCHEMA_VALIDATION");
  const schemaResult = validateSchemaDesign(files);

  state.updatePhase("MIGRATION_TRACKING");
  const migrationResult = trackMigrations(files);

  state.updatePhase("ORM_ANALYSIS");
  const ormResult = detectOrmMisuse(files);

  state.setIntermediateIssues(Object.freeze({
    schemaIssues:    schemaResult.issues,
    migrationIssues: migrationResult.issues,
    ormIssues:       ormResult.issues,
    builtAt:         Date.now(),
  }));

  state.updatePhase("REPORT_GENERATION");
  const report = compileDbSchemaReport(
    reportId,
    nowMs,
    files.length,
    schemaResult.issues,
    migrationResult.issues,
    ormResult.issues,
  );

  state.updatePhase("COMPLETE");
  state.markComplete();
  state.setLastReport(report);

  return report;
}

export function analyzeDbSchemaMultiple(
  fileGroups: readonly (readonly CodeFile[])[],
): readonly DbSchemaReport[] {
  if (!Array.isArray(fileGroups) || fileGroups.length === 0) {
    return Object.freeze<DbSchemaReport[]>([]);
  }
  return Object.freeze(fileGroups.map(analyzeDbSchema));
}

export function getLastReport(): Readonly<DbSchemaReport> | null {
  return state.getLastReport();
}

export function getReportHistory(): readonly DbSchemaReport[] {
  return state.getReportHistory();
}

export function resetAnalyzer(): void {
  _reportCounter = 0;
  state.clearAll();
}
