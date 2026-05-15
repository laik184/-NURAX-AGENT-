/**
 * runtime-checker.ts
 *
 * Check the project's runtime process and log health.
 *
 * Reads the live log buffer and runtime manager to produce two checks:
 *   1. process_alive  — is the server process running?
 *   2. runtime_logs   — does the log tail contain fatal errors?
 *
 * Ownership: verification/runtime — single responsibility: process + log health.
 * Delegates to server/runtime (logBuffer, logAnalyzer, runtimeManager).
 */

import { runtimeManager }  from "../../infrastructure/runtime/runtime-manager.ts";
import { logBuffer }        from "../../runtime/observer/log-buffer.ts";
import { analyzeLines }     from "../../runtime/observer/log-analyzer.ts";
import type { CheckResult } from "../types.ts";

const LOG_TAIL = 60;

export async function checkRuntime(projectId: number): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  // ── Check 1: process alive ─────────────────────────────────────────────────
  const entry = runtimeManager.get(projectId);

  if (!entry) {
    results.push({
      name:    "process_alive",
      status:  "skipped",
      message: "No dev server running for this project — runtime checks skipped.",
    });
    return results;
  }

  const alive = entry.status === "running" || entry.status === "starting";
  results.push({
    name:    "process_alive",
    status:  alive ? "passed" : "failed",
    message: alive
      ? `Process alive (pid ${entry.pid}, port ${entry.port}, uptime ${Math.round(entry.uptimeMs / 1000)}s)`
      : `Process is ${entry.status} — server is not running`,
    detail: alive ? undefined : `Call server_restart to bring the server back up.`,
  });

  if (!alive) return results;

  // ── Check 2: runtime log errors ────────────────────────────────────────────
  const tailLines = logBuffer.tail(projectId, LOG_TAIL);
  const analysis  = analyzeLines(tailLines);

  if (!analysis.hasErrors && !analysis.hasFatalError) {
    results.push({
      name:    "runtime_logs",
      status:  "passed",
      message: `Log tail (${tailLines.length} lines): no errors detected.`,
    });
  } else if (analysis.hasFatalError) {
    const top = analysis.errors.slice(0, 3).map(e => `[${e.type}] ${e.line.slice(0, 150)}`).join("; ");
    results.push({
      name:    "runtime_logs",
      status:  "failed",
      message: `Fatal error(s) detected in server logs.`,
      detail:  `Top errors: ${top}. Fix the root cause, then call server_restart.`,
    });
  } else {
    const top = analysis.errors[0];
    results.push({
      name:    "runtime_logs",
      status:  "warning",
      message: `Non-fatal error(s) in logs: ${analysis.errors.length} warning(s).`,
      detail:  top ? `[${top.type}] ${top.line.slice(0, 150)}` : undefined,
    });
  }

  return results;
}
