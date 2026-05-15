/**
 * project-context-builder.ts
 *
 * Build a compressed project context string for injection into the LLM
 * at the start of each agent run.
 *
 * Reads:
 *   - run-history.jsonl  → last 5 run summaries
 *   - failures.json      → last 3 recent failures
 *   - context.md         → project narrative (capped)
 *
 * Returns a single compact string that fits in ~800 tokens.
 * Returns null if no memory exists yet (first run for this project).
 *
 * Ownership: memory/context — context assembly only.
 */

import { readRecentRuns, readFailures, readContextMd } from "../persistence/memory-store.ts";
import type { RunSummary, FailureEntry } from "../types.ts";

const MAX_RUNS_IN_CONTEXT    = 5;
const MAX_FAILURES_IN_CONTEXT = 3;
const MAX_CONTEXT_MD_CHARS   = 800;

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatRun(run: RunSummary, index: number): string {
  const date   = new Date(run.ts).toISOString().slice(0, 10);
  const status = run.success ? "✓" : "✗";
  const goal   = run.goal.slice(0, 100);
  const note   = run.success
    ? run.summary.slice(0, 150)
    : `FAILED: ${run.failReason?.slice(0, 120) ?? "unknown"}`;
  return `${index + 1}. [${date}] ${status} "${goal}"\n   ${note}`;
}

function formatFailure(f: FailureEntry, index: number): string {
  const date = new Date(f.ts).toISOString().slice(0, 10);
  return `${index + 1}. [${date}] "${f.goal.slice(0, 80)}" → ${f.reason.slice(0, 120)}`;
}

// ─── Builder ──────────────────────────────────────────────────────────────────

export async function buildProjectContext(projectId: number): Promise<string | null> {
  // Load all memory sources in parallel
  const [recentRuns, failures, contextMd] = await Promise.all([
    readRecentRuns(projectId, MAX_RUNS_IN_CONTEXT),
    readFailures(projectId),
    readContextMd(projectId),
  ]);

  const hasRuns     = recentRuns.length > 0;
  const hasFailures = failures.length > 0;
  const hasContext  = contextMd.trim().length > 0;

  // First run — no memory yet
  if (!hasRuns && !hasContext) return null;

  const sections: string[] = [
    "=== PROJECT MEMORY ===",
    `Project ID: ${projectId}`,
    "This is a continuation. The following context captures what has already been built.",
    "",
  ];

  // Recent runs
  if (hasRuns) {
    sections.push("RECENT RUNS (most recent first):");
    sections.push(...recentRuns.map(formatRun));
    sections.push("");
  }

  // Recent failures (separate attention block)
  const recentFailures = failures.slice(0, MAX_FAILURES_IN_CONTEXT);
  if (hasFailures && recentFailures.length > 0) {
    sections.push("KNOWN FAILURES (avoid repeating these):");
    sections.push(...recentFailures.map(formatFailure));
    sections.push("");
  }

  // Project narrative (capped)
  if (hasContext) {
    const narrative = contextMd.trim().slice(-MAX_CONTEXT_MD_CHARS);
    sections.push("PROJECT LOG (recent activity):");
    sections.push(narrative);
    sections.push("");
  }

  sections.push(
    "=== INSTRUCTIONS ===",
    "Use the above context to avoid repeating completed work.",
    "Do NOT redo things already built in previous runs unless the user's new goal requires changes.",
    "Build on what exists. Continue where previous runs left off.",
    "=== END PROJECT MEMORY ===",
  );

  return sections.join("\n");
}
