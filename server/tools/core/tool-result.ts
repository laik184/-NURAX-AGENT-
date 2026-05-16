/**
 * server/tools/core/tool-result.ts
 *
 * ToolResult factory helpers for consistent result construction.
 */

export interface ToolResult {
  ok: boolean;
  result?: unknown;
  error?: string;
}

// ── Factories ─────────────────────────────────────────────────────────────────

export function ok(result?: unknown): ToolResult {
  return { ok: true, result };
}

export function fail(error: string): ToolResult {
  return { ok: false, error };
}

export function fromError(e: unknown): ToolResult {
  const msg = e instanceof Error
    ? e.message
    : typeof e === "string"
      ? e
      : "Unknown error";
  return { ok: false, error: msg };
}

export function aborted(): ToolResult {
  return { ok: false, error: "Tool execution was aborted" };
}

// ── Guards ────────────────────────────────────────────────────────────────────

export function isOk(result: ToolResult): result is ToolResult & { ok: true } {
  return result.ok === true;
}

export function isFail(result: ToolResult): result is ToolResult & { ok: false; error: string } {
  return result.ok === false;
}

// ── Truncation ────────────────────────────────────────────────────────────────

const MAX_RESULT_BYTES = 10 * 1024; // 10 KB

/**
 * Truncate a ToolResult's stringified payload so it doesn't blow the LLM
 * context window when returned as a tool call response.
 */
export function truncateResult(result: ToolResult): ToolResult {
  if (!result.result) return result;
  const str = JSON.stringify(result.result);
  if (str.length <= MAX_RESULT_BYTES) return result;
  return {
    ...result,
    result: {
      truncated: true,
      preview: str.slice(0, MAX_RESULT_BYTES),
      originalBytes: str.length,
    },
  };
}
