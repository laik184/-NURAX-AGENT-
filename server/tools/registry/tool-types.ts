/**
 * server/tools/registry/tool-types.ts
 *
 * Canonical type definitions for the unified tool registry.
 * All other modules import types from here — single source of truth.
 */

// ── Re-export primitive types from the agent layer ───────────────────────────
export type { Tool, ToolContext, ToolResult, ToolDef } from "../../agents/tools/types.ts";

// ── Categories ────────────────────────────────────────────────────────────────

export type ToolCategory =
  | "file"
  | "shell"
  | "package"
  | "server"
  | "preview"
  | "env"
  | "git"
  | "db"
  | "deploy"
  | "testing"
  | "browser"
  | "network"
  | "auth"
  | "agent-control";

// ── Permission levels ─────────────────────────────────────────────────────────

export type PermissionLevel = "safe" | "restricted" | "dangerous";

export interface ToolPermissions {
  level: PermissionLevel;
  requiresSandbox: boolean;
  allowsNetworkAccess: boolean;
  allowsProcessSpawn: boolean;
  allowsFileWrite: boolean;
}

// ── Registry entry ────────────────────────────────────────────────────────────

export interface RegisteredTool {
  tool: import("../../agents/tools/types.ts").Tool;
  category: ToolCategory;
  terminal: boolean;
  defaultTimeoutMs: number;
  permissions: ToolPermissions;
}

// ── Execution options ─────────────────────────────────────────────────────────

export interface ExecuteOptions {
  timeoutMs?: number;
  emitEvents?: boolean;
  skipSecurity?: boolean;
}

// ── Metrics ───────────────────────────────────────────────────────────────────

export interface ToolMetrics {
  name: string;
  category: ToolCategory;
  calls: number;
  successes: number;
  failures: number;
  totalDurationMs: number;
  avgDurationMs: number;
  lastCalledAt: number | null;
}

// ── Orchestrator stats ────────────────────────────────────────────────────────

export interface RegistryStats {
  totalTools: number;
  totalCalls: number;
  totalSuccesses: number;
  totalFailures: number;
  activeConcurrentCalls: number;
  categoryCounts: Record<ToolCategory, number>;
  perTool: ToolMetrics[];
}
