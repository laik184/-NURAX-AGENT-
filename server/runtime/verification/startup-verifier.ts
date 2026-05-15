/**
 * startup-verifier.ts
 *
 * Orchestrates post-start verification:
 *   1. Detect startup signal via log observation (startup-detector)
 *   2. Probe the local port for HTTP reachability (port-probe)
 *   3. Classify the combined result into a VerificationOutcome
 *   4. Build a concise LLM-friendly summary
 *
 * Ownership: runtime/verification — orchestration only.
 * Delegates to observer + health layers. No bus access, no mutations.
 */

import { detectStartup } from "../observer/startup-detector.ts";
import { probePortWithRetry } from "../health/port-probe.ts";
import type { VerificationOutcome, VerificationResult } from "./verification-types.ts";
import type { AnalysisResult } from "../observer/log-analyzer.ts";
import type { ProbeResult } from "../health/port-probe.ts";

// ─── Config ───────────────────────────────────────────────────────────────────

const LOG_WINDOW_MS = 10_000; // How long to watch logs before giving up

// ─── Classification ───────────────────────────────────────────────────────────

function classify(
  analysis:  AnalysisResult,
  probe:     ProbeResult,
  logOutcome: "healthy" | "failed" | "timeout",
): VerificationOutcome {
  if (analysis.hasFatalError)                               return "failed";
  if (logOutcome === "healthy"  && probe.reachable)         return "healthy";
  if (logOutcome === "healthy"  && !probe.reachable)        return "port_unreachable";
  if (logOutcome === "failed")                              return "failed";
  if (logOutcome === "timeout"  && probe.reachable)         return "degraded";
  return "timeout";
}

// ─── Summary builders ─────────────────────────────────────────────────────────

function buildSummary(r: Omit<VerificationResult, "summary" | "llmSummary">): string {
  const lines: string[] = [];
  lines.push(`Outcome: ${r.outcome}`);
  if (r.port) lines.push(`Port ${r.port}: ${r.probe.reachable ? "responding" : "not responding"} (${r.probe.latencyMs}ms)`);
  if (r.analysis.successLine) lines.push(`Startup signal: "${r.analysis.successLine.slice(0, 120)}"`);
  if (r.analysis.errors.length > 0) {
    lines.push(`Errors detected (${r.analysis.errors.length}):`);
    for (const e of r.analysis.errors.slice(0, 3)) {
      lines.push(`  [${e.type}] ${e.line.slice(0, 150)}`);
    }
  }
  lines.push(`Elapsed: ${r.elapsedMs}ms`);
  return lines.join("\n");
}

function buildLlmSummary(r: Omit<VerificationResult, "summary" | "llmSummary">): string {
  switch (r.outcome) {
    case "healthy":
      return `Server started successfully on port ${r.port}. Port is responding (${r.probe.latencyMs}ms). No fatal errors detected.`;
    case "degraded":
      return `Server appears to be running on port ${r.port} but startup signal was not detected within ${LOG_WINDOW_MS}ms. Port is responding. Monitor logs.`;
    case "failed": {
      const topError = r.analysis.errors[0];
      return `Server failed to start. Fatal error: [${topError?.type ?? "unknown"}] ${topError?.line?.slice(0, 200) ?? "see logs"}. Call server_logs for full output, then fix the issue and call server_restart.`;
    }
    case "port_unreachable":
      return `Startup signal detected but port ${r.port} is not yet responding to HTTP. Server may still be initialising — call server_logs to check, then wait briefly.`;
    case "timeout":
      return `Server did not emit a clear startup signal within ${LOG_WINDOW_MS}ms and port ${r.port} is not responding. Call server_logs to diagnose.`;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function verifyStartup(
  projectId: number,
  port:      number,
): Promise<VerificationResult> {
  const verifyStart = Date.now();

  // Run log detection and port probe in parallel
  const [detection, probe] = await Promise.all([
    detectStartup(projectId, LOG_WINDOW_MS),
    probePortWithRetry(port, 4, 2_000),
  ]);

  const outcome = classify(detection.analysis, probe, detection.outcome);

  const partial: Omit<VerificationResult, "summary" | "llmSummary"> = {
    projectId,
    port,
    outcome,
    analysis:  detection.analysis,
    probe,
    elapsedMs: Date.now() - verifyStart,
  };

  return {
    ...partial,
    summary:    buildSummary(partial),
    llmSummary: buildLlmSummary(partial),
  };
}
