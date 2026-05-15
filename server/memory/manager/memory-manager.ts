/**
 * memory-manager.ts
 *
 * Unified project-scoped facade for all memory operations.
 *
 * Callers (tool-loop.executor.ts, API routes) interact with ONE object
 * instead of importing individual functions from scattered modules.
 *
 * Responsibilities:
 *   - loadContext()        — build compressed LLM-ready context string
 *   - saveRunSummary()     — persist run outcome to all .nura/ files
 *   - getArchitecture()    — read architecture.md
 *   - setArchitecture()    — overwrite architecture.md
 *   - getDecisions()       — read decisions.json (last N)
 *   - getRecentRuns()      — read run-history.jsonl (last N)
 *   - getFailures()        — read failures.json (last N)
 *
 * Ownership: memory/manager — orchestration facade only.
 * All I/O is delegated to persistence/memory-store.ts.
 * All context building is delegated to context/ modules.
 *
 * Usage:
 *   const mem = MemoryManager.for(projectId);
 *   const ctx = await mem.loadContext();
 *   // ... agent run ...
 *   await mem.saveRunSummary(runId, goal, result);
 */

import { buildProjectContext }   from "../context/project-context-builder.ts";
import { summarizeAndPersist }   from "../context/run-summarizer.ts";
import {
  readArchitectureMd,
  writeArchitectureMd,
  readDecisions,
  readRecentRuns,
  readFailures,
}                                 from "../persistence/memory-store.ts";
import type { SummarizableResult } from "../context/run-summarizer.ts";
import type { ArchitectureDecision, RunSummary, FailureEntry } from "../types.ts";

export class MemoryManager {
  private constructor(private readonly projectId: number) {}

  // ── Factory ─────────────────────────────────────────────────────────────────

  /** Get a MemoryManager for a specific project. Lightweight — no I/O. */
  static for(projectId: number): MemoryManager {
    return new MemoryManager(projectId);
  }

  // ── Context ─────────────────────────────────────────────────────────────────

  /**
   * Build a compressed project context string for LLM injection.
   * Returns null on the very first run (no .nura/ memory exists yet).
   */
  async loadContext(): Promise<string | null> {
    return buildProjectContext(this.projectId);
  }

  // ── Persistence ──────────────────────────────────────────────────────────────

  /**
   * Persist a run outcome to all .nura/ files.
   * Always fire-and-forget from the executor: `void mem.saveRunSummary(...)`.
   * Swallows all errors internally — memory writes never crash the agent run.
   */
  async saveRunSummary(
    runId:  string,
    goal:   string,
    result: SummarizableResult,
  ): Promise<void> {
    return summarizeAndPersist(this.projectId, runId, goal, result);
  }

  // ── Architecture ─────────────────────────────────────────────────────────────

  /** Read the current architecture.md narrative. Returns "" if not yet seeded. */
  async getArchitecture(): Promise<string> {
    return readArchitectureMd(this.projectId);
  }

  /**
   * Overwrite architecture.md with new content.
   * Useful for tool-based architecture updates (e.g. after a major refactor).
   */
  async setArchitecture(content: string): Promise<void> {
    return writeArchitectureMd(this.projectId, content);
  }

  // ── Queries ──────────────────────────────────────────────────────────────────

  async getDecisions(limit = 10): Promise<ArchitectureDecision[]> {
    const all = await readDecisions(this.projectId);
    return all.slice(0, limit);
  }

  async getRecentRuns(limit = 10): Promise<RunSummary[]> {
    return readRecentRuns(this.projectId, limit);
  }

  async getFailures(limit = 10): Promise<FailureEntry[]> {
    const all = await readFailures(this.projectId);
    return all.slice(0, limit);
  }
}
