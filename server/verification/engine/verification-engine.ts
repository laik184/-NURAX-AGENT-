/**
 * verification-engine.ts
 *
 * Central orchestrator for all post-execution verification checks.
 *
 * Runs all checkers in parallel, aggregates results, classifies the
 * overall outcome, and builds the LLM-actionable feedback payload.
 *
 * Ownership: verification/engine — orchestration only.
 * No LLM calls, no direct bus access, no retry logic.
 *
 * MAX 250 lines.
 */

import { checkRuntime }        from "../runtime/runtime-checker.ts";
import { checkTypeScript }     from "../runtime/typescript-validator.ts";
import { checkPackageInstall } from "../runtime/package-validator.ts";
import { checkPreviewHttp }    from "../preview/preview-validator.ts";
import type {
  CheckResult,
  CheckStatus,
  VerificationReport,
  VerificationStatus,
} from "../types.ts";

// ─── Config ───────────────────────────────────────────────────────────────────

/** Checks with these statuses block task_complete. */
const BLOCKING_STATUSES: Set<CheckStatus> = new Set(["failed"]);

// ─── Aggregation helpers ──────────────────────────────────────────────────────

function deriveStatus(checks: CheckResult[]): VerificationStatus {
  const hasBlocking = checks.some(c => BLOCKING_STATUSES.has(c.status));
  const hasWarning  = checks.some(c => c.status === "warning");
  if (hasBlocking) return "failed";
  if (hasWarning)  return "warned";
  return "passed";
}

function extractIssues(checks: CheckResult[]): string[] {
  return checks
    .filter(c => BLOCKING_STATUSES.has(c.status))
    .map(c => c.message);
}

function extractRequiredActions(checks: CheckResult[]): string[] {
  return checks
    .filter(c => BLOCKING_STATUSES.has(c.status) && c.detail)
    .map(c => c.detail as string);
}

// ─── Engine ───────────────────────────────────────────────────────────────────

export async function runVerificationEngine(
  projectId: number,
  runId:     string,
): Promise<VerificationReport> {
  const startTs = Date.now();

  // Run all checks in parallel — independent, no ordering needed
  const [runtimeChecks, tsCheck, pkgCheck, previewCheck] = await Promise.all([
    checkRuntime(projectId),
    checkTypeScript(projectId),
    checkPackageInstall(projectId),
    checkPreviewHttp(projectId),
  ]);

  const checks: CheckResult[] = [
    ...runtimeChecks,
    tsCheck,
    pkgCheck,
    previewCheck,
  ];

  const status  = deriveStatus(checks);
  const issues  = extractIssues(checks);
  const actions = extractRequiredActions(checks);

  return {
    projectId,
    runId,
    status,
    passed:          status !== "failed",
    checks,
    issues,
    requiredActions: actions,
    elapsedMs:       Date.now() - startTs,
  };
}

// ─── LLM feedback builder ─────────────────────────────────────────────────────

/**
 * Build the content to replace the task_complete tool result with when
 * verification fails. The LLM receives this and must continue working.
 */
export function buildVerificationFeedback(
  report:  VerificationReport,
  attempt: number,
  maxRetries: number,
): string {
  const remaining = maxRetries - attempt;
  const lines: string[] = [
    `task_complete BLOCKED — verification found ${report.issues.length} issue(s) that must be fixed first.`,
    `Attempt ${attempt}/${maxRetries} (${remaining} attempt(s) remaining before this run ends).`,
    "",
    "ISSUES DETECTED:",
    ...report.issues.map((iss, i) => `  ${i + 1}. ${iss}`),
  ];

  if (report.requiredActions.length > 0) {
    lines.push("", "REQUIRED ACTIONS:");
    for (const action of report.requiredActions) {
      lines.push(`  • ${action}`);
    }
  }

  lines.push(
    "",
    "Fix all issues above, then call task_complete again once the app is working correctly.",
    "Do NOT call task_complete until all issues are resolved.",
  );

  return JSON.stringify({
    ok:               false,
    verification_failed: true,
    attempt,
    maxRetries,
    issues:           report.issues,
    requiredActions:  report.requiredActions,
    checks:           report.checks.map(c => ({
      name:    c.name,
      status:  c.status,
      message: c.message,
    })),
    message: lines.join("\n"),
  });
}

/**
 * Build the content injected when max retries are exhausted.
 * The run completes but the LLM is informed verification was bypassed.
 */
export function buildExhaustedFeedback(
  report:    VerificationReport,
  maxRetries: number,
): string {
  return JSON.stringify({
    ok:               true,
    verification_exhausted: true,
    warning: `Verification failed after ${maxRetries} attempts — task marked complete with unresolved issues.`,
    issues:  report.issues,
    message: "Completing with warnings. The following issues were detected but could not be resolved: " +
             report.issues.join("; "),
  });
}
