/**
 * server/tools/core/tool-context.ts
 *
 * ToolContext utilities — create, validate, and augment execution contexts.
 */

export interface ToolContext {
  projectId: number;
  runId: string;
  signal?: AbortSignal;
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function createContext(
  projectId: number,
  runId: string,
  signal?: AbortSignal,
): ToolContext {
  return { projectId, runId, signal };
}

// ── Validation ────────────────────────────────────────────────────────────────

export interface ContextValidation {
  valid: boolean;
  reason?: string;
}

export function validateContext(ctx: unknown): ContextValidation {
  if (!ctx || typeof ctx !== "object") {
    return { valid: false, reason: "ctx must be a non-null object" };
  }
  const c = ctx as Record<string, unknown>;
  if (typeof c.projectId !== "number" || !Number.isInteger(c.projectId) || c.projectId < 0) {
    return { valid: false, reason: "ctx.projectId must be a non-negative integer" };
  }
  if (typeof c.runId !== "string" || !c.runId.trim()) {
    return { valid: false, reason: "ctx.runId must be a non-empty string" };
  }
  return { valid: true };
}

// ── Guard ─────────────────────────────────────────────────────────────────────

export function isAborted(ctx: ToolContext): boolean {
  return ctx.signal?.aborted ?? false;
}
