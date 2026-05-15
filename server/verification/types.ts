/**
 * server/verification/types.ts
 *
 * Shared types for the verification layer.
 * No logic, no imports from other verification modules.
 */

// ─── Individual check result ──────────────────────────────────────────────────

export type CheckName =
  | "runtime_logs"
  | "typescript_errors"
  | "package_install"
  | "preview_http"
  | "process_alive";

export type CheckStatus = "passed" | "failed" | "skipped" | "warning";

export interface CheckResult {
  name:     CheckName;
  status:   CheckStatus;
  message:  string;
  /** Actionable detail for the LLM (trimmed to ~300 chars). */
  detail?:  string;
}

// ─── Aggregated verification report ──────────────────────────────────────────

export type VerificationStatus = "passed" | "failed" | "warned";

export interface VerificationReport {
  projectId:   number;
  runId:       string;
  status:      VerificationStatus;
  passed:      boolean;
  checks:      CheckResult[];
  /** Top-level issues the LLM must fix before completing. */
  issues:      string[];
  /** Concrete actions the LLM should take. */
  requiredActions: string[];
  elapsedMs:   number;
}

// ─── Retry state ──────────────────────────────────────────────────────────────

export interface RetryState {
  runId:      string;
  attempts:   number;
  maxRetries: number;
  exhausted:  boolean;
}
