import type {
  CodeFile,
  SecurityReport,
  SecuritySession,
} from "./types.js";
import * as state from "./state.js";

import { enforceAuthLayer }       from "./agents/auth-layer.enforcer.agent.js";
import { detectSecretsExposure }  from "./agents/secrets-exposure.detector.agent.js";
import { scanForInjections }      from "./agents/injection.scanner.agent.js";
import { validateRbac }           from "./agents/rbac.validator.agent.js";
import { compileSecurityReport }  from "./agents/security-reporter.agent.js";

let _reportCounter = 0;

function nextReportId(): string {
  _reportCounter += 1;
  return `sec-${Date.now()}-${String(_reportCounter).padStart(4, "0")}`;
}

function nextSessionId(): string {
  return `ssess-${Date.now()}`;
}

function buildEmptyReport(reportId: string, nowMs: number): SecurityReport {
  return Object.freeze({
    reportId,
    analyzedAt:           nowMs,
    totalFiles:           0,
    totalIssues:          0,
    issues:               Object.freeze([]),
    authViolationCount:   0,
    secretExposureCount:  0,
    injectionRiskCount:   0,
    rbacViolationCount:   0,
    criticalCount:        0,
    highCount:            0,
    mediumCount:          0,
    lowCount:             0,
    overallScore:         100,
    isSecure:             true,
    summary:              "No files provided for security analysis.",
  });
}

function createSession(fileCount: number): SecuritySession {
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

export function analyzeSecurity(
  files: readonly CodeFile[],
): SecurityReport {
  const nowMs    = Date.now();
  const reportId = nextReportId();

  if (!isValidInput(files) || files.length === 0) {
    const r = buildEmptyReport(reportId, nowMs);
    state.setLastReport(r);
    return r;
  }

  const session = createSession(files.length);
  state.setSession(session);

  state.updatePhase("AUTH_ENFORCEMENT");
  const authResult = enforceAuthLayer(files);

  state.updatePhase("SECRETS_DETECTION");
  const secretResult = detectSecretsExposure(files);

  state.updatePhase("INJECTION_SCANNING");
  const injectionResult = scanForInjections(files);

  state.updatePhase("RBAC_VALIDATION");
  const rbacResult = validateRbac(files);

  state.setIntermediateIssues(Object.freeze({
    authIssues:      authResult.issues,
    secretIssues:    secretResult.issues,
    injectionIssues: injectionResult.issues,
    rbacIssues:      rbacResult.issues,
    builtAt:         Date.now(),
  }));

  state.updatePhase("REPORT_GENERATION");
  const report = compileSecurityReport(
    reportId,
    nowMs,
    files.length,
    authResult.issues,
    secretResult.issues,
    injectionResult.issues,
    rbacResult.issues,
  );

  state.updatePhase("COMPLETE");
  state.markComplete();
  state.setLastReport(report);

  return report;
}

export function analyzeSecurityMultiple(
  fileGroups: readonly (readonly CodeFile[])[],
): readonly SecurityReport[] {
  if (!Array.isArray(fileGroups) || fileGroups.length === 0) {
    return Object.freeze<SecurityReport[]>([]);
  }
  return Object.freeze(fileGroups.map(analyzeSecurity));
}

export function getLastReport(): Readonly<SecurityReport> | null {
  return state.getLastReport();
}

export function getReportHistory(): readonly SecurityReport[] {
  return state.getReportHistory();
}

export function resetAnalyzer(): void {
  _reportCounter = 0;
  state.clearAll();
}
