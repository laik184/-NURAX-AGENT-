/**
 * server/memory/types.ts
 *
 * Shared types for the execution memory layer.
 * No logic, no imports from other memory modules.
 */

// ─── Per-run summary (one line in run-history.jsonl) ─────────────────────────

export interface RunSummary {
  runId:       string;
  ts:          number;
  goal:        string;
  summary:     string;
  success:     boolean;
  stopReason:  string;
  /** Failure reason if !success */
  failReason?: string;
}

// ─── Failure entry (stored in failures.json) ──────────────────────────────────

export interface FailureEntry {
  runId:   string;
  ts:      number;
  goal:    string;
  reason:  string;
}

// ─── Project memory snapshot (in-memory representation of .nura/ files) ──────

export interface ProjectMemory {
  contextMd:    string;        // content of context.md (project narrative)
  recentRuns:   RunSummary[];  // last N runs from run-history.jsonl
  failures:     FailureEntry[]; // last N failures
}
