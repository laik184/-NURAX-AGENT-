/**
 * server/tools/registry/tool-events.ts
 *
 * Standardised event emitter for the unified tool registry.
 *
 * Every tool execution emits exactly four lifecycle events:
 *   tool.start   — before execution begins
 *   tool.output  — when a tool produces intermediate output (optional)
 *   tool.success — execution completed successfully
 *   tool.error   — execution failed
 *
 * Events flow through the global event bus so SSE/WebSocket clients
 * receive real-time feedback without polling.
 */

import { bus } from "../../infrastructure/events/bus.ts";
import type { ToolResult } from "./tool-types.ts";

// ── Event kind ────────────────────────────────────────────────────────────────

export type ToolEventKind =
  | "tool.start"
  | "tool.output"
  | "tool.success"
  | "tool.error";

// ── Emitters ──────────────────────────────────────────────────────────────────

export function emitToolStart(
  runId: string,
  tool: string,
  argSummary: unknown,
): void {
  bus.emit("agent.event", {
    runId,
    eventType: "tool.start",
    phase: "tool-loop",
    payload: { tool, status: "running", args: argSummary },
    ts: Date.now(),
  });
}

export function emitToolOutput(
  runId: string,
  tool: string,
  chunk: unknown,
): void {
  bus.emit("agent.event", {
    runId,
    eventType: "tool.output",
    phase: "tool-loop",
    payload: { tool, chunk },
    ts: Date.now(),
  });
}

export function emitToolSuccess(
  runId: string,
  tool: string,
  resultSummary: unknown,
  durationMs: number,
): void {
  bus.emit("agent.event", {
    runId,
    eventType: "tool.success",
    phase: "tool-loop",
    payload: { tool, status: "done", result: resultSummary, durationMs },
    ts: Date.now(),
  });
}

export function emitToolError(
  runId: string,
  tool: string,
  error: string,
  durationMs: number,
): void {
  bus.emit("agent.event", {
    runId,
    eventType: "tool.error",
    phase: "tool-loop",
    payload: { tool, status: "error", error, durationMs },
    ts: Date.now(),
  });
}

// ── Legacy compat shim ────────────────────────────────────────────────────────
// Keeps the old "agent.tool_call" event shape alive so existing SSE consumers
// don't break during the migration period.

export function emitLegacyToolCall(
  runId: string,
  tool: string,
  status: "running" | "done" | "error",
  payload: unknown,
  durationMs?: number,
): void {
  bus.emit("agent.event", {
    runId,
    eventType: "agent.tool_call",
    phase: "tool-loop",
    payload: { tool, status, ...(payload as object), durationMs },
    ts: Date.now(),
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build a concise, non-sensitive summary of a ToolResult for event payloads.
 */
export function summariseResult(name: string, res: ToolResult): unknown {
  if (!res.ok) return { error: (res.error ?? "unknown").slice(0, 200) };
  const r = res.result as Record<string, unknown> | undefined;
  if (!r) return { ok: true };

  switch (name) {
    case "file_read":    return { path: r["path"], bytes: (r["content"] as string)?.length ?? 0 };
    case "file_list":    return { count: (r["tree"] as string)?.split("\n").length ?? 0 };
    case "file_search":  return { count: r["count"], truncated: r["truncated"] };
    case "file_replace": return { path: r["path"], replacements: r["replacements"] };
    case "shell_exec":   return { exitCode: r["exitCode"] };
    case "server_start":
    case "server_restart":
    case "preview_url":  return r;
    case "server_logs":  return { status: r["status"], lineCount: (r["lines"] as unknown[])?.length ?? 0 };
    case "package_install": return { installed: r["installed"], exitCode: r["exitCode"] };
    case "env_read":     return { path: r["path"], count: r["count"] };
    default:             return { ok: true };
  }
}

/**
 * Build a concise, non-sensitive summary of args for event payloads.
 */
export function summariseArgs(name: string, args: Record<string, unknown>): unknown {
  switch (name) {
    case "file_write":   return { path: args["path"], bytes: (args["content"] as string)?.length };
    case "file_replace": return { path: args["path"], old_bytes: (args["old_string"] as string)?.length, new_bytes: (args["new_string"] as string)?.length };
    case "file_read":
    case "file_delete":
    case "file_list":    return { path: args["path"] };
    case "file_search":  return { pattern: args["pattern"], path: args["path"], glob: args["glob"] };
    case "shell_exec":   return { command: args["command"], args: args["args"] };
    case "package_install": return { packages: args["packages"], dev: args["dev"] };
    case "env_write":    return { key: args["key"] };
    case "git_commit":   return { message: args["message"] };
    case "git_add":      return { paths: args["paths"] ?? "all" };
    default:             return args;
  }
}
