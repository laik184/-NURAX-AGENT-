/**
 * server/tools/observation/memory/execution-memory.ts
 *
 * Per-run ring-buffer of execution entries.
 * Enables the AI to query: "what have I tried so far, what failed?"
 *
 * Keyed by runId — released when the run completes.
 * Max 50 entries per run to bound memory usage.
 */

import type { ExecutionEntry, RunMemorySummary } from "./execution-entry.ts";
import type { FailureClass, ActionRecommendation } from "../types.ts";

const MAX_ENTRIES = 50;
const LOOP_WINDOW  = 4;   // last N calls to check for loop
const LOOP_THRESH  = 3;   // same tool failing >= this many times in window

// ── Per-run memory ─────────────────────────────────────────────────────────────

class ExecutionMemory {
  private readonly runs = new Map<string, ExecutionEntry[]>();
  private seq = 0;

  /** Record a completed execution into the run's memory. */
  record(
    runId: string,
    toolName: string,
    ok: boolean,
    failureClass: FailureClass | null,
    errorSnippet: string | null,
    durationMs: number,
    recommendation: ActionRecommendation,
  ): void {
    let entries = this.runs.get(runId);
    if (!entries) {
      entries = [];
      this.runs.set(runId, entries);
    }
    entries.push({
      seq: ++this.seq,
      toolName,
      ok,
      failureClass,
      errorSnippet: errorSnippet?.slice(0, 200) ?? null,
      durationMs,
      recommendation,
      ts: Date.now(),
    });
    // Ring buffer — evict oldest if over limit
    if (entries.length > MAX_ENTRIES) entries.shift();
  }

  /** Summarise the run's execution history for LLM injection. */
  summarise(runId: string): RunMemorySummary {
    const entries = this.runs.get(runId) ?? [];
    const failed  = entries.filter((e) => !e.ok);

    // Loop detection: last LOOP_WINDOW calls — same tool failing >= LOOP_THRESH
    const window  = entries.slice(-LOOP_WINDOW);
    const toolCounts = new Map<string, number>();
    for (const e of window) {
      if (!e.ok) toolCounts.set(e.toolName, (toolCounts.get(e.toolName) ?? 0) + 1);
    }
    const loopDetected = [...toolCounts.values()].some((n) => n >= LOOP_THRESH);

    return {
      totalCalls:   entries.length,
      failedCalls:  failed.length,
      failedTools:  [...new Set(failed.map((e) => e.toolName))],
      recentErrors: failed.slice(-5).map((e) => `${e.toolName}: ${e.errorSnippet ?? e.failureClass ?? "error"}`),
      loopDetected,
    };
  }

  /** Get raw entries for a run. */
  getEntries(runId: string): ExecutionEntry[] {
    return this.runs.get(runId) ?? [];
  }

  /** Count consecutive failures of the same tool at the end of the run. */
  consecutiveFailures(runId: string, toolName: string): number {
    const entries = this.runs.get(runId) ?? [];
    let count = 0;
    for (let i = entries.length - 1; i >= 0; i--) {
      if (entries[i].toolName !== toolName || entries[i].ok) break;
      count++;
    }
    return count;
  }

  /** Release all memory for a completed run. */
  release(runId: string): void {
    this.runs.delete(runId);
  }
}

export const executionMemory = new ExecutionMemory();
