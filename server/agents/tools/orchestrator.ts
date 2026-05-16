/**
 * server/agents/tools/orchestrator.ts
 *
 * ToolOrchestrator — thin adapter over the unified tool registry.
 *
 * The heavy lifting (validation, security, events, metrics, permissions)
 * now lives in server/tools/. This file preserves the existing import surface
 * so all callers (tool-loop.agent.ts, pipeline, API routes) keep working
 * without changes.
 *
 * USAGE:
 *   import { toolOrchestrator } from './orchestrator.ts';
 *   const result = await toolOrchestrator.execute('file_write', { path: 'x.ts', content: '...' }, ctx);
 */

// ── Boot the unified registry (registers all 38 tools) ───────────────────────
import "../../tools/index.ts";

import { unifiedRegistry } from "../../tools/registry/tool-registry.ts";
import type {
  Tool,
  ToolContext,
  ToolResult,
  ToolDef,
  ToolCategory,
  ToolMetrics,
  RegistryStats,
  ExecuteOptions,
} from "../../tools/registry/tool-types.ts";

// ── Re-export types needed by external callers ────────────────────────────────
export type { ToolCategory, ToolMetrics, ExecuteOptions };
export type { ToolContext };

// ── Thin orchestrator façade ──────────────────────────────────────────────────

class ToolOrchestrator {
  // ── Single tool execution ─────────────────────────────────────────────────

  async execute(
    name: string,
    args: Record<string, unknown>,
    ctx: ToolContext,
    opts: ExecuteOptions = {},
  ): Promise<ToolResult> {
    return unifiedRegistry.execute(name, args, ctx, opts);
  }

  // ── Parallel multi-tool execution ─────────────────────────────────────────

  async executeMany(
    calls: Array<{ name: string; args: Record<string, unknown> }>,
    ctx: ToolContext,
    opts: ExecuteOptions = {},
  ): Promise<Array<{ name: string; result: ToolResult }>> {
    return unifiedRegistry.executeMany(calls, ctx, opts);
  }

  // ── Lookup helpers ────────────────────────────────────────────────────────

  getTool(name: string): Tool | undefined {
    return unifiedRegistry.getTool(name);
  }

  getEntry(name: string) {
    return unifiedRegistry.getEntry(name);
  }

  getByCategory(category: ToolCategory) {
    return unifiedRegistry.getByCategory(category);
  }

  isTerminal(name: string): boolean {
    return unifiedRegistry.isTerminal(name);
  }

  has(name: string): boolean {
    return unifiedRegistry.has(name);
  }

  // ── Catalog ───────────────────────────────────────────────────────────────

  list() {
    return unifiedRegistry.list();
  }

  get toolDefs(): ToolDef[] {
    return unifiedRegistry.toolDefs;
  }

  get totalCount(): number {
    return unifiedRegistry.totalCount;
  }

  // ── Metrics ───────────────────────────────────────────────────────────────

  getStats(): RegistryStats {
    return unifiedRegistry.getStats();
  }

  getToolMetrics(name: string): ToolMetrics | undefined {
    return unifiedRegistry.getMetrics(name);
  }

  resetMetrics(): void {
    unifiedRegistry.resetMetrics();
  }
}

// ── Singleton export ──────────────────────────────────────────────────────────

export const toolOrchestrator = new ToolOrchestrator();

// ── Registry-compatible surface (drop-in replacement for legacy registry.ts) ──

export const TOOLS = unifiedRegistry.list().map((e) => unifiedRegistry.getTool(e.name)!);
export const TOOL_DEFS: ToolDef[] = unifiedRegistry.toolDefs;
export const TERMINAL_TOOL_NAMES = unifiedRegistry.terminalToolNames;

export function getTool(name: string): Tool | undefined {
  return unifiedRegistry.getTool(name);
}

// ── Pipeline integration: runToolsOperation ───────────────────────────────────
// Called by the pipeline registry entry 'tools:orchestrator'.

export type ToolsOpKind = "execute" | "executeMany" | "list" | "list-category" | "stats" | "get";

export interface ToolsOperationInput {
  op?: ToolsOpKind;
  tool?: string;
  args?: Record<string, unknown>;
  ctx?: { projectId: number; runId: string; signal?: AbortSignal };
  calls?: Array<{ name: string; args: Record<string, unknown> }>;
  category?: string;
}

export async function runToolsOperation(input: unknown): Promise<unknown> {
  const inp = (input ?? {}) as ToolsOperationInput;
  const op: ToolsOpKind = inp.op ?? "stats";

  switch (op) {
    case "execute": {
      if (!inp.tool) throw new Error("[tools:orchestrator] execute — missing: tool");
      if (!inp.ctx)  throw new Error("[tools:orchestrator] execute — missing: ctx");
      return unifiedRegistry.execute(inp.tool, inp.args ?? {}, inp.ctx as ToolContext);
    }

    case "executeMany": {
      if (!inp.ctx)   throw new Error("[tools:orchestrator] executeMany — missing: ctx");
      if (!inp.calls) throw new Error("[tools:orchestrator] executeMany — missing: calls");
      return unifiedRegistry.executeMany(inp.calls, inp.ctx as ToolContext);
    }

    case "list": {
      return { tools: unifiedRegistry.list(), total: unifiedRegistry.totalCount };
    }

    case "list-category": {
      if (!inp.category) throw new Error("[tools:orchestrator] list-category — missing: category");
      const entries = unifiedRegistry.getByCategory(inp.category as ToolCategory);
      return { category: inp.category, tools: entries.map((e) => e.tool.name), count: entries.length };
    }

    case "stats": {
      return unifiedRegistry.getStats();
    }

    case "get": {
      if (!inp.tool) throw new Error("[tools:orchestrator] get — missing: tool");
      const entry = unifiedRegistry.getEntry(inp.tool);
      if (!entry) return { found: false, tool: inp.tool };
      return {
        found:       true,
        name:        entry.tool.name,
        category:    entry.category,
        description: entry.tool.description,
        terminal:    entry.terminal,
        permissions: entry.permissions,
        metrics:     unifiedRegistry.getMetrics(entry.tool.name),
      };
    }

    default:
      throw new Error(`[tools:orchestrator] Unknown op: "${op}"`);
  }
}
