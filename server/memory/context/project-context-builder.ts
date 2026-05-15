/**
 * project-context-builder.ts
 *
 * Build a compressed project context string for injection into the LLM
 * at the start of each agent run.
 *
 * Reads (all in parallel):
 *   - run-history.jsonl  → last 5 run summaries
 *   - failures.json      → last 3 recent failures
 *   - decisions.json     → last 5 architecture decisions
 *   - architecture.md    → architectural decisions narrative (capped)
 *   - context.md         → run log (capped)
 *
 * Returns a single compact string that fits in ~1000 tokens.
 * Returns null on the very first run for this project (no .nura/ yet).
 *
 * Ownership: memory/context — context assembly only. No I/O directly.
 */

import {
  readRecentRuns,
  readFailures,
  readDecisions,
  readArchitectureMd,
  readContextMd,
} from "../persistence/memory-store.ts";
import type { RunSummary, FailureEntry, ArchitectureDecision } from "../types.ts";

// ─── Caps ─────────────────────────────────────────────────────────────────────

const MAX_RUNS       = 5;
const MAX_FAILURES   = 3;
const MAX_DECISIONS  = 5;
const MAX_ARCH_CHARS = 600;
const MAX_LOG_CHARS  = 400;

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtRun(r: RunSummary, i: number): string {
  const date = new Date(r.ts).toISOString().slice(0, 10);
  const icon = r.success ? "✓" : "✗";
  const note = r.success
    ? r.summary.slice(0, 130)
    : `FAILED: ${r.failReason?.slice(0, 110) ?? "unknown"}`;
  return `${i + 1}. [${date}] ${icon} "${r.goal.slice(0, 90)}"\n   ${note}`;
}

function fmtFailure(f: FailureEntry, i: number): string {
  const date = new Date(f.ts).toISOString().slice(0, 10);
  return `${i + 1}. [${date}] "${f.goal.slice(0, 70)}" → ${f.reason.slice(0, 100)}`;
}

function fmtDecision(d: ArchitectureDecision, i: number): string {
  return `${i + 1}. "${d.goal.slice(0, 70)}" → ${d.summary.slice(0, 130)}`;
}

// ─── Builder ──────────────────────────────────────────────────────────────────

export async function buildProjectContext(projectId: number): Promise<string | null> {
  const [recentRuns, failures, decisions, archMd, contextMd] = await Promise.all([
    readRecentRuns(projectId, MAX_RUNS),
    readFailures(projectId),
    readDecisions(projectId),
    readArchitectureMd(projectId),
    readContextMd(projectId),
  ]);

  const hasRuns      = recentRuns.length > 0;
  const hasDecisions = decisions.length > 0;
  const hasArch      = archMd.trim().length > 0;
  const hasContext   = contextMd.trim().length > 0;

  // No memory yet — first run for this project
  if (!hasRuns && !hasArch && !hasContext) return null;

  const parts: string[] = [
    "=== PROJECT MEMORY ===",
    `Project ID: ${projectId}`,
    "Context from previous agent runs — use this to continue building without repeating work.",
    "",
  ];

  // Architecture decisions (highest priority — decisions shape everything)
  if (hasArch) {
    parts.push("ARCHITECTURE (existing design decisions):");
    parts.push(archMd.trim().slice(-MAX_ARCH_CHARS));
    parts.push("");
  } else if (hasDecisions) {
    parts.push("ARCHITECTURE DECISIONS (recent):");
    parts.push(...decisions.slice(0, MAX_DECISIONS).map(fmtDecision));
    parts.push("");
  }

  // Recent runs (what the agent actually did)
  if (hasRuns) {
    parts.push("RECENT RUNS (most recent first):");
    parts.push(...recentRuns.map(fmtRun));
    parts.push("");
  }

  // Failures (avoid repeating)
  const recentFails = failures.slice(0, MAX_FAILURES);
  if (recentFails.length > 0) {
    parts.push("KNOWN FAILURES (do NOT repeat these mistakes):");
    parts.push(...recentFails.map(fmtFailure));
    parts.push("");
  }

  // Run log (recent activity)
  if (hasContext) {
    parts.push("ACTIVITY LOG (recent):");
    parts.push(contextMd.trim().slice(-MAX_LOG_CHARS));
    parts.push("");
  }

  parts.push(
    "=== INSTRUCTIONS ===",
    "• Build on the existing architecture above. Do NOT restart from scratch.",
    "• Do NOT redo work already marked ✓ in recent runs.",
    "• If a previous run failed, fix the root cause — do not repeat the same approach.",
    "• Follow established patterns and package choices from prior runs.",
    "=== END PROJECT MEMORY ===",
  );

  return parts.join("\n");
}
