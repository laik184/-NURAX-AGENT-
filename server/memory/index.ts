/**
 * server/memory/index.ts
 *
 * Public API for the execution memory layer.
 *
 * Preferred usage: MemoryManager.for(projectId)
 *
 * The function exports (buildProjectContext, summarizeAndPersist) are kept
 * for backwards-compatibility with tool-loop.executor.ts. New consumers
 * should use MemoryManager instead.
 */

// ── Primary API ───────────────────────────────────────────────────────────────

export { MemoryManager }          from "./manager/memory-manager.ts";

// ── Function API (backwards-compatible) ──────────────────────────────────────

export { buildProjectContext }    from "./context/project-context-builder.ts";
export { summarizeAndPersist }    from "./context/run-summarizer.ts";

// ── Types ─────────────────────────────────────────────────────────────────────

export type { SummarizableResult }     from "./context/run-summarizer.ts";
export type {
  RunSummary,
  FailureEntry,
  ArchitectureDecision,
  ProjectMemory,
}                                      from "./types.ts";
