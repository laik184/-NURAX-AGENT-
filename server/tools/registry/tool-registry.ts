/**
 * server/tools/registry/tool-registry.ts
 *
 * THE unified tool registry — single source of truth for all 38 tools.
 *
 * Replaces the fragmented dual-registry pattern (registry.ts + orchestrator.ts
 * both maintaining independent tool lists). All execution flows through here.
 *
 * Public API:
 *   unifiedRegistry.execute()       — execute one tool through the full pipeline
 *   unifiedRegistry.executeMany()   — parallel multi-tool execution
 *   unifiedRegistry.register()      — dynamically add a tool at runtime
 *   unifiedRegistry.has()           — check if a tool exists
 *   unifiedRegistry.getTool()       — lookup by name
 *   unifiedRegistry.getEntry()      — lookup full RegisteredTool entry
 *   unifiedRegistry.getByCategory() — list tools in a category
 *   unifiedRegistry.list()          — structured catalog
 *   unifiedRegistry.toolDefs        — OpenAI-compatible function definitions
 *   unifiedRegistry.getStats()      — per-tool metrics + global counters
 *   unifiedRegistry.getMetrics()    — per-tool metrics entry
 *   unifiedRegistry.resetMetrics()  — flush metrics (testing)
 */

import type {
  Tool,
  ToolContext,
  ToolResult,
  ToolDef,
  RegisteredTool,
  ToolCategory,
  ToolMetrics,
  RegistryStats,
  ExecuteOptions,
} from "./tool-types.ts";
import { executeTool } from "../core/execute-tool.ts";

// ── UnifiedToolRegistry ───────────────────────────────────────────────────────

class UnifiedToolRegistry {
  private readonly _byName     = new Map<string, RegisteredTool>();
  private readonly _byCategory = new Map<ToolCategory, RegisteredTool[]>();
  private readonly _metrics    = new Map<string, ToolMetrics>();
  private _activeCalls = 0;

  // ── Registration ──────────────────────────────────────────────────────────

  register(entry: RegisteredTool): void {
    if (this._byName.has(entry.tool.name)) {
      console.warn(`[tool-registry] Replacing already-registered tool "${entry.tool.name}"`);
    }

    this._byName.set(entry.tool.name, entry);

    if (!this._byCategory.has(entry.category)) {
      this._byCategory.set(entry.category, []);
    }
    this._byCategory.get(entry.category)!.push(entry);

    this._metrics.set(entry.tool.name, {
      name:            entry.tool.name,
      category:        entry.category,
      calls:           0,
      successes:       0,
      failures:        0,
      totalDurationMs: 0,
      avgDurationMs:   0,
      lastCalledAt:    null,
    });
  }

  registerAll(entries: RegisteredTool[]): void {
    for (const e of entries) this.register(e);
  }

  // ── Execution ─────────────────────────────────────────────────────────────

  async execute(
    name: string,
    args: Record<string, unknown>,
    ctx: ToolContext,
    opts: ExecuteOptions = {},
  ): Promise<ToolResult> {
    const entry = this._byName.get(name);
    if (!entry) {
      return { ok: false, error: `[tool-registry] Unknown tool: "${name}"` };
    }

    this._activeCalls++;
    const startTs = Date.now();

    let result: ToolResult;
    try {
      result = await executeTool(entry, args, ctx, opts);
    } finally {
      this._activeCalls--;
    }

    this._recordMetric(name, result.ok, Date.now() - startTs);
    return result;
  }

  async executeMany(
    calls: Array<{ name: string; args: Record<string, unknown> }>,
    ctx: ToolContext,
    opts: ExecuteOptions = {},
  ): Promise<Array<{ name: string; result: ToolResult }>> {
    return Promise.all(
      calls.map(async ({ name, args }) => ({
        name,
        result: await this.execute(name, args, ctx, opts),
      })),
    );
  }

  // ── Lookups ───────────────────────────────────────────────────────────────

  has(name: string): boolean {
    return this._byName.has(name);
  }

  getTool(name: string): Tool | undefined {
    return this._byName.get(name)?.tool;
  }

  getEntry(name: string): RegisteredTool | undefined {
    return this._byName.get(name);
  }

  getByCategory(category: ToolCategory): RegisteredTool[] {
    return this._byCategory.get(category) ?? [];
  }

  isTerminal(name: string): boolean {
    return this._byName.get(name)?.terminal ?? false;
  }

  get totalCount(): number {
    return this._byName.size;
  }

  // ── Catalog ───────────────────────────────────────────────────────────────

  list(): Array<{
    name: string;
    category: ToolCategory;
    description: string;
    terminal: boolean;
  }> {
    return [...this._byName.values()].map((e) => ({
      name:        e.tool.name,
      category:    e.category,
      description: e.tool.description,
      terminal:    e.terminal,
    }));
  }

  get toolDefs(): ToolDef[] {
    return [...this._byName.values()].map((e) => ({
      type: "function" as const,
      function: {
        name:        e.tool.name,
        description: e.tool.description,
        parameters:  e.tool.parameters,
      },
    }));
  }

  get terminalToolNames(): Set<string> {
    const names = new Set<string>();
    for (const [name, entry] of this._byName) {
      if (entry.terminal) names.add(name);
    }
    return names;
  }

  // ── Metrics ───────────────────────────────────────────────────────────────

  getMetrics(name: string): ToolMetrics | undefined {
    return this._metrics.get(name);
  }

  getStats(): RegistryStats {
    const perTool        = [...this._metrics.values()];
    const totalCalls     = perTool.reduce((s, m) => s + m.calls,     0);
    const totalSuccesses = perTool.reduce((s, m) => s + m.successes, 0);
    const totalFailures  = perTool.reduce((s, m) => s + m.failures,  0);

    const categoryCounts = {} as Record<ToolCategory, number>;
    for (const [cat, tools] of this._byCategory) {
      categoryCounts[cat] = tools.length;
    }

    return {
      totalTools:            this._byName.size,
      totalCalls,
      totalSuccesses,
      totalFailures,
      activeConcurrentCalls: this._activeCalls,
      categoryCounts,
      perTool,
    };
  }

  resetMetrics(): void {
    for (const m of this._metrics.values()) {
      m.calls           = 0;
      m.successes       = 0;
      m.failures        = 0;
      m.totalDurationMs = 0;
      m.avgDurationMs   = 0;
      m.lastCalledAt    = null;
    }
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private _recordMetric(name: string, ok: boolean, durationMs: number): void {
    const m = this._metrics.get(name);
    if (!m) return;
    m.calls++;
    if (ok) m.successes++; else m.failures++;
    m.totalDurationMs += durationMs;
    m.avgDurationMs    = Math.round(m.totalDurationMs / m.calls);
    m.lastCalledAt     = Date.now();
  }
}

// ── Singleton export ──────────────────────────────────────────────────────────

export const unifiedRegistry = new UnifiedToolRegistry();
export type { UnifiedToolRegistry };
