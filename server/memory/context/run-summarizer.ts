/**
 * run-summarizer.ts
 *
 * Post-run: extract a structured summary and persist it to .nura/.
 *
 * Called by tool-loop.executor.ts immediately after runAgentLoopWithContinuation
 * resolves. Deterministic — no LLM calls.
 *
 * Responsibilities:
 *   1. Build a RunSummary from the loop result
 *   2. Append it to run-history.jsonl
 *   3. If failed, append a FailureEntry to failures.json
 *   4. Update context.md with a short run log line
 *
 * Ownership: memory/context — summarization logic only.
 * Delegates all I/O to memory-store.ts.
 */

import {
  appendRunSummary,
  appendFailure,
  readContextMd,
  writeContextMd,
} from "../persistence/memory-store.ts";
import type { RunSummary, FailureEntry } from "../types.ts";

/** Minimal view of an AgentLoopResult needed for summarization. */
export interface SummarizableResult {
  success:    boolean;
  steps:      number;
  summary:    string;
  stopReason: string;
  error?:     string;
}

// ─── Context.md helpers ───────────────────────────────────────────────────────

const MAX_CONTEXT_CHARS = 4_000;

function buildRunLine(summary: RunSummary): string {
  const date   = new Date(summary.ts).toISOString().slice(0, 10);
  const status = summary.success ? "✓" : "✗";
  const goal   = summary.goal.slice(0, 120);
  const text   = summary.summary.slice(0, 200);
  return `[${date}] ${status} ${goal}\n   → ${text}`;
}

async function updateContextMd(
  projectId: number,
  runLine:   string,
): Promise<void> {
  let existing = await readContextMd(projectId);

  // First run — seed the file
  if (!existing) {
    existing = "# Project Run Log\n\nThis file tracks what the agent has built across runs.\n\n## Runs\n";
  }

  const updated = existing + "\n" + runLine;

  // Prune if oversized — keep the header + last portion
  const pruned = updated.length > MAX_CONTEXT_CHARS
    ? updated.slice(-MAX_CONTEXT_CHARS)
    : updated;

  await writeContextMd(projectId, pruned);
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function summarizeAndPersist(
  projectId: number,
  runId:     string,
  goal:      string,
  result:    SummarizableResult,
): Promise<void> {
  try {
    const summary: RunSummary = {
      runId,
      ts:         Date.now(),
      goal,
      summary:    result.summary.slice(0, 500),
      success:    result.success,
      stopReason: result.stopReason,
      failReason: result.success ? undefined : (result.error ?? result.summary).slice(0, 300),
    };

    // Fire all writes in parallel — none depend on each other
    const writes: Promise<void>[] = [
      appendRunSummary(projectId, summary),
      updateContextMd(projectId, buildRunLine(summary)),
    ];

    if (!result.success) {
      const failure: FailureEntry = {
        runId,
        ts:     summary.ts,
        goal,
        reason: summary.failReason ?? "Unknown failure",
      };
      writes.push(appendFailure(projectId, failure));
    }

    await Promise.all(writes);
  } catch {
    // Memory write failures must NEVER crash the agent run
  }
}
