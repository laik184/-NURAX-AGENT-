/**
 * server/memory/index.ts
 *
 * Public API for the execution memory layer.
 *
 * All external consumers import ONLY from here.
 * Internal modules (persistence/, context/) are implementation details.
 */

export { buildProjectContext }    from "./context/project-context-builder.ts";
export { summarizeAndPersist }    from "./context/run-summarizer.ts";
export type { SummarizableResult } from "./context/run-summarizer.ts";
export type { RunSummary, FailureEntry, ProjectMemory } from "./types.ts";
