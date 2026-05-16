/**
 * server/tools/core/execute-tool.ts
 *
 * THE single entry point for all tool execution.
 *
 * Pipeline (in order):
 *  1. Context validation
 *  2. Argument shape validation
 *  3. Abort signal check
 *  4. Permission gate
 *  5. Argument schema validation (required fields + types)
 *  6. Argument sanitisation (injection guard)
 *  7. Timeout wrapping
 *  8. Tool run()
 *  9. Metrics recording
 * 10. Audit logging
 * 11. Event emission (tool.start → tool.success | tool.error)
 */

import type { ToolContext, ToolResult, ExecuteOptions } from "../registry/tool-types.ts";
import type { RegisteredTool } from "../registry/tool-types.ts";
import { validateContext } from "./tool-context.ts";
import { validateToolArgs, validateArgsShape } from "../registry/tool-validator.ts";
import { sanitizeArgs } from "../registry/tool-security.ts";
import { runPermissionGate } from "./tool-permissions.ts";
import {
  emitToolStart,
  emitToolSuccess,
  emitToolError,
  emitLegacyToolCall,
  summariseArgs,
  summariseResult,
} from "../registry/tool-events.ts";
import { auditLog } from "../registry/tool-security.ts";
import { fromError, aborted } from "./tool-result.ts";

// ── Timeout wrapper ───────────────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number, toolName: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Tool "${toolName}" timed out after ${ms}ms`)),
      ms,
    );
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

// ── Main executor ─────────────────────────────────────────────────────────────

export async function executeTool(
  entry: RegisteredTool,
  args: unknown,
  ctx: ToolContext,
  opts: ExecuteOptions = {},
): Promise<ToolResult> {
  const name      = entry.tool.name;
  const emit      = opts.emitEvents !== false;
  const startTs   = Date.now();
  const timeoutMs = opts.timeoutMs ?? entry.defaultTimeoutMs;

  // ── 1. Context validation ────────────────────────────────────────────────
  const ctxCheck = validateContext(ctx);
  if (!ctxCheck.valid) {
    return { ok: false, error: `Invalid context: ${ctxCheck.reason}` };
  }

  // ── 2. Args shape ────────────────────────────────────────────────────────
  if (!validateArgsShape(args)) {
    return { ok: false, error: `"${name}": args must be a plain object` };
  }

  // ── 3. Abort signal ──────────────────────────────────────────────────────
  if (ctx.signal?.aborted) return aborted();

  // ── 4. Permission gate ───────────────────────────────────────────────────
  if (!opts.skipSecurity) {
    const perm = runPermissionGate(entry.category);
    if (!perm.allowed) {
      return { ok: false, error: `Permission denied for "${name}": ${perm.reason}` };
    }
  }

  // ── 5. Schema validation ─────────────────────────────────────────────────
  const schemaCheck = validateToolArgs(entry.tool, args);
  if (!schemaCheck.valid) {
    return { ok: false, error: `"${name}" validation failed: ${schemaCheck.errors.join("; ")}` };
  }

  // ── 6. Sanitisation ──────────────────────────────────────────────────────
  if (!opts.skipSecurity) {
    const sanity = sanitizeArgs(args);
    if (!sanity.safe) {
      return { ok: false, error: `"${name}" blocked by security: ${sanity.reason}` };
    }
  }

  // ── 7. Emit start ────────────────────────────────────────────────────────
  const argSummary = summariseArgs(name, args);
  if (emit) {
    emitToolStart(ctx.runId, name, argSummary);
    emitLegacyToolCall(ctx.runId, name, "running", { args: argSummary });
  }

  // ── 8. Execute with timeout ──────────────────────────────────────────────
  let result: ToolResult;
  try {
    result = await withTimeout(entry.tool.run(args, ctx), timeoutMs, name);
  } catch (e) {
    result = fromError(e);
  }

  const durationMs = Date.now() - startTs;

  // ── 9–10. Emit outcome + audit ───────────────────────────────────────────
  if (emit) {
    const summary = summariseResult(name, result);
    if (result.ok) {
      emitToolSuccess(ctx.runId, name, summary, durationMs);
    } else {
      emitToolError(ctx.runId, name, result.error ?? "unknown", durationMs);
    }
    emitLegacyToolCall(ctx.runId, name, result.ok ? "done" : "error", {
      result: result.ok ? summary : undefined,
      error: result.error,
      durationMs,
    });
  }

  auditLog({
    ts: startTs,
    tool: name,
    projectId: ctx.projectId,
    runId: ctx.runId,
    ok: result.ok,
    durationMs,
  });

  return result;
}
