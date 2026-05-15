/**
 * verification-types.ts
 *
 * Shared types for the runtime startup verification layer.
 *
 * Ownership: runtime/verification — types only, no logic.
 */

import type { AnalysisResult } from "../observer/log-analyzer.ts";
import type { ProbeResult } from "../health/port-probe.ts";

// ─── Outcomes ─────────────────────────────────────────────────────────────────

export type VerificationOutcome =
  | "healthy"          // server up, port responding, no fatal errors
  | "degraded"         // server up but has non-fatal errors or slow start
  | "failed"           // fatal error in logs, server not usable
  | "port_unreachable" // process alive but port not yet accepting connections
  | "timeout";         // no signal within window

// ─── Result ───────────────────────────────────────────────────────────────────

export interface VerificationResult {
  projectId:   number;
  port?:       number;
  outcome:     VerificationOutcome;
  analysis:    AnalysisResult;
  probe:       ProbeResult;
  elapsedMs:   number;
  summary:     string;
  /** Compact version safe to inject into LLM context (trimmed). */
  llmSummary:  string;
}
