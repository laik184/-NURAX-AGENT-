/**
 * startup-detector.ts
 *
 * Watch a project's log buffer for a fixed window and determine if the
 * server started successfully, failed, or timed out.
 *
 * Ownership: runtime/observer — single responsibility: startup signal detection.
 * Uses logBuffer (read) + logAnalyzer (pure). No LLM, no mutations.
 */

import { logBuffer } from "./log-buffer.ts";
import { analyzeLines, type AnalysisResult } from "./log-analyzer.ts";

// ─── Config ───────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS  = 500;
const DEFAULT_WINDOW_MS = 10_000;

// ─── Types ────────────────────────────────────────────────────────────────────

export type StartupOutcome = "healthy" | "failed" | "timeout";

export interface StartupDetectionResult {
  outcome:   StartupOutcome;
  analysis:  AnalysisResult;
  elapsedMs: number;
  logLines:  string[];
}

// ─── Detector ─────────────────────────────────────────────────────────────────

/**
 * Poll the log buffer for `windowMs` milliseconds.
 * Resolves early if a definitive signal (success or fatal error) is detected.
 * Returns after `windowMs` regardless, with the best classification found.
 */
export function detectStartup(
  projectId: number,
  windowMs = DEFAULT_WINDOW_MS,
): Promise<StartupDetectionResult> {
  return new Promise((resolve) => {
    const startTs  = Date.now();
    let   settled  = false;

    function finish(outcome: StartupOutcome, analysis: AnalysisResult): void {
      if (settled) return;
      settled = true;
      clearInterval(ticker);
      clearTimeout(deadline);
      const lines = logBuffer.since(projectId, startTs).map(l => l.text);
      resolve({ outcome, analysis, elapsedMs: Date.now() - startTs, logLines: lines });
    }

    const ticker = setInterval(() => {
      const lines    = logBuffer.since(projectId, startTs);
      const analysis = analyzeLines(lines);

      if (analysis.hasSuccessSignal && !analysis.hasFatalError) {
        finish("healthy", analysis);
      } else if (analysis.hasFatalError) {
        finish("failed", analysis);
      }
    }, POLL_INTERVAL_MS);

    const deadline = setTimeout(() => {
      const lines    = logBuffer.since(projectId, startTs);
      const analysis = analyzeLines(lines);
      // On timeout: if success seen, still healthy; if errors, failed; else unknown→timeout
      if (analysis.hasSuccessSignal && !analysis.hasFatalError) {
        finish("healthy", analysis);
      } else if (analysis.hasFatalError) {
        finish("failed", analysis);
      } else {
        finish("timeout", analysis);
      }
    }, windowMs);
  });
}
