/**
 * server/agents/tools/orchestrator.ts
 *
 * ToolOrchestrator — Central controller for ALL 38 registered agent tools.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * BEFORE (registry.ts only):
 *   - Passive flat list: TOOLS[], TOOL_DEFS[], getTool(name)
 *   - No metrics, no category grouping, no timeout wrapping
 *   - No validation, no event emission, no concurrency tracking
 *   - Every caller (tool-loop.agent.ts) had to manually handle errors
 *
 * NOW (orchestrator.ts):
 *   - execute()      → single controlled entry point with full lifecycle
 *   - executeMany()  → parallel multi-tool execution
 *   - getByCategory()→ category-based tool lookup
 *   - getStats()     → per-tool + global metrics
 *   - validate()     → required-field check before execution
 *   - isTerminal()   → check if tool ends the agent loop
 *   - list()         → structured tool catalog
 *   - reset()        → flush metrics (testing/dev)
 * ──────────────────────────────────────────────────────────────────────────
 *
 * USAGE:
 *   import { toolOrchestrator } from './orchestrator.ts';
 *
 *   const result = await toolOrchestrator.execute('file_write', { path: 'x.ts', content: '...' }, ctx);
 *   const stats  = toolOrchestrator.getStats();
 *   const files  = toolOrchestrator.getByCategory('file');
 */

import type { Tool, ToolContext, ToolResult, ToolDef } from "./types.ts";
import { bus } from "../../infrastructure/events/bus.ts";

// ── Imports: all 38 tools ────────────────────────────────────────────────────
import { fileList, fileRead, fileWrite, fileDelete }                           from "./categories/file-tools.ts";
import { fileSearch, fileReplace }                                              from "./categories/file-search-tools.ts";
import { shellExec }                                                            from "./categories/shell-tools.ts";
import { packageInstall, packageUninstall, packageAudit, detectMissingPackages } from "./categories/package-tools.ts";
import { serverStart, serverStop, serverRestart, serverLogs }                   from "./categories/server-lifecycle-tools.ts";
import { previewUrl, previewScreenshot }                                        from "./categories/preview-tools.ts";
import { envRead, envWrite }                                                    from "./categories/env-tools.ts";
import { gitStatus, gitAdd, gitCommit, gitClone, gitPush, gitPull }             from "./categories/git-tools.ts";
import { dbPush, dbMigrate }                                                    from "./categories/db-tools.ts";
import { deployPublish }                                                        from "./categories/deploy-tools.ts";
import { testRun, debugRun, monitorCheck }                                      from "./categories/testing-tools.ts";
import { browserEval }                                                          from "./categories/browser-tools.ts";
import { apiCall, searchWeb }                                                   from "./categories/network-tools.ts";
import { authLogin }                                                            from "./categories/auth-tools.ts";
import { taskComplete, agentMessage, agentQuestion }                            from "./categories/agent-control-tools.ts";

// ── Types ────────────────────────────────────────────────────────────────────

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

export interface RegisteredTool {
  tool: Tool;
  category: ToolCategory;
  terminal: boolean;
  defaultTimeoutMs: number;
}

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

export interface ExecuteOptions {
  timeoutMs?: number;
  emitEvents?: boolean;
}

export interface OrchestratorStats {
  totalTools: number;
  totalCalls: number;
  totalSuccesses: number;
  totalFailures: number;
  activeConcurrentCalls: number;
  categoryCounts: Record<ToolCategory, number>;
  perTool: ToolMetrics[];
}

// ── Category metadata for all 38 tools ──────────────────────────────────────

const TOOL_REGISTRY: RegisteredTool[] = [
  // ── FILE (6) ──────────────────────────────────────────────────────────────
  { tool: fileList,               category: "file",          terminal: false, defaultTimeoutMs: 10_000 },
  { tool: fileRead,               category: "file",          terminal: false, defaultTimeoutMs: 10_000 },
  { tool: fileWrite,              category: "file",          terminal: false, defaultTimeoutMs: 10_000 },
  { tool: fileDelete,             category: "file",          terminal: false, defaultTimeoutMs: 10_000 },
  { tool: fileSearch,             category: "file",          terminal: false, defaultTimeoutMs: 15_000 },
  { tool: fileReplace,            category: "file",          terminal: false, defaultTimeoutMs: 10_000 },

  // ── SHELL (1) ─────────────────────────────────────────────────────────────
  { tool: shellExec,              category: "shell",         terminal: false, defaultTimeoutMs: 30_000 },

  // ── PACKAGE (4) ───────────────────────────────────────────────────────────
  { tool: packageInstall,         category: "package",       terminal: false, defaultTimeoutMs: 120_000 },
  { tool: packageUninstall,       category: "package",       terminal: false, defaultTimeoutMs: 60_000  },
  { tool: packageAudit,           category: "package",       terminal: false, defaultTimeoutMs: 30_000  },
  { tool: detectMissingPackages,  category: "package",       terminal: false, defaultTimeoutMs: 10_000  },

  // ── SERVER LIFECYCLE (4) ──────────────────────────────────────────────────
  { tool: serverStart,            category: "server",        terminal: false, defaultTimeoutMs: 15_000  },
  { tool: serverStop,             category: "server",        terminal: false, defaultTimeoutMs: 10_000  },
  { tool: serverRestart,          category: "server",        terminal: false, defaultTimeoutMs: 15_000  },
  { tool: serverLogs,             category: "server",        terminal: false, defaultTimeoutMs: 5_000   },

  // ── PREVIEW (2) ───────────────────────────────────────────────────────────
  { tool: previewUrl,             category: "preview",       terminal: false, defaultTimeoutMs: 5_000   },
  { tool: previewScreenshot,      category: "preview",       terminal: false, defaultTimeoutMs: 20_000  },

  // ── ENV (2) ───────────────────────────────────────────────────────────────
  { tool: envRead,                category: "env",           terminal: false, defaultTimeoutMs: 5_000   },
  { tool: envWrite,               category: "env",           terminal: false, defaultTimeoutMs: 5_000   },

  // ── GIT (6) ───────────────────────────────────────────────────────────────
  { tool: gitStatus,              category: "git",           terminal: false, defaultTimeoutMs: 10_000  },
  { tool: gitAdd,                 category: "git",           terminal: false, defaultTimeoutMs: 10_000  },
  { tool: gitCommit,              category: "git",           terminal: false, defaultTimeoutMs: 10_000  },
  { tool: gitClone,               category: "git",           terminal: false, defaultTimeoutMs: 60_000  },
  { tool: gitPush,                category: "git",           terminal: false, defaultTimeoutMs: 30_000  },
  { tool: gitPull,                category: "git",           terminal: false, defaultTimeoutMs: 30_000  },

  // ── DATABASE (2) ──────────────────────────────────────────────────────────
  { tool: dbPush,                 category: "db",            terminal: false, defaultTimeoutMs: 60_000  },
  { tool: dbMigrate,              category: "db",            terminal: false, defaultTimeoutMs: 60_000  },

  // ── DEPLOY (1) ────────────────────────────────────────────────────────────
  { tool: deployPublish,          category: "deploy",        terminal: false, defaultTimeoutMs: 120_000 },

  // ── TESTING / DEBUG (3) ───────────────────────────────────────────────────
  { tool: testRun,                category: "testing",       terminal: false, defaultTimeoutMs: 60_000  },
  { tool: debugRun,               category: "testing",       terminal: false, defaultTimeoutMs: 30_000  },
  { tool: monitorCheck,           category: "testing",       terminal: false, defaultTimeoutMs: 10_000  },

  // ── BROWSER (1) ───────────────────────────────────────────────────────────
  { tool: browserEval,            category: "browser",       terminal: false, defaultTimeoutMs: 20_000  },

  // ── NETWORK (2) ───────────────────────────────────────────────────────────
  { tool: apiCall,                category: "network",       terminal: false, defaultTimeoutMs: 15_000  },
  { tool: searchWeb,              category: "network",       terminal: false, defaultTimeoutMs: 10_000  },

  // ── AUTH (1) ──────────────────────────────────────────────────────────────
  { tool: authLogin,              category: "auth",          terminal: false, defaultTimeoutMs: 10_000  },

  // ── AGENT CONTROL (3) ─────────────────────────────────────────────────────
  { tool: taskComplete,           category: "agent-control", terminal: true,  defaultTimeoutMs: 5_000   },
  { tool: agentMessage,           category: "agent-control", terminal: false, defaultTimeoutMs: 5_000   },
  { tool: agentQuestion,          category: "agent-control", terminal: false, defaultTimeoutMs: 5_000   },
];

// ── ToolOrchestrator Class ───────────────────────────────────────────────────

class ToolOrchestrator {
  // Internal maps built once at startup
  private readonly _byName   = new Map<string, RegisteredTool>();
  private readonly _byCategory = new Map<ToolCategory, RegisteredTool[]>();

  // Live metrics per tool
  private readonly _metrics  = new Map<string, ToolMetrics>();

  // Concurrency counter
  private _activeCalls = 0;

  constructor(registry: RegisteredTool[]) {
    for (const entry of registry) {
      // Name map
      this._byName.set(entry.tool.name, entry);

      // Category map
      if (!this._byCategory.has(entry.category)) {
        this._byCategory.set(entry.category, []);
      }
      this._byCategory.get(entry.category)!.push(entry);

      // Initialize metrics
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
  }

  // ── Core: execute one tool ──────────────────────────────────────────────

  async execute(
    name: string,
    args: Record<string, unknown>,
    ctx: ToolContext,
    opts: ExecuteOptions = {},
  ): Promise<ToolResult> {
    const entry = this._byName.get(name);
    if (!entry) {
      return { ok: false, error: `ToolOrchestrator: unknown tool "${name}"` };
    }

    // Required-field validation
    const validationError = this._validateArgs(entry.tool, args);
    if (validationError) {
      return { ok: false, error: validationError };
    }

    const emitEvents = opts.emitEvents !== false;
    const timeoutMs  = opts.timeoutMs ?? entry.defaultTimeoutMs;
    const startTs    = Date.now();

    this._activeCalls++;

    if (emitEvents) {
      bus.emit("agent.event", {
        runId:     ctx.runId,
        eventType: "agent.tool_call",
        phase:     "tool-loop",
        payload:   { tool: name, status: "running", args: this._summariseArgs(name, args) },
        ts:        startTs,
      });
    }

    let result: ToolResult;

    try {
      result = await this._withTimeout(entry.tool.run(args, ctx), timeoutMs, name);
    } catch (e: any) {
      result = { ok: false, error: e?.message ?? String(e) };
    } finally {
      this._activeCalls--;
    }

    const durationMs = Date.now() - startTs;
    this._recordMetric(name, result.ok, durationMs);

    if (emitEvents) {
      bus.emit("agent.event", {
        runId:     ctx.runId,
        eventType: "agent.tool_call",
        phase:     "tool-loop",
        payload: {
          tool:     name,
          status:   result.ok ? "done" : "error",
          result:   result.ok ? this._summariseResult(name, result) : undefined,
          error:    result.error,
          durationMs,
        },
        ts: Date.now(),
      });
    }

    return result;
  }

  // ── Core: execute multiple tools in parallel ────────────────────────────

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

  // ── Lookup helpers ──────────────────────────────────────────────────────

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

  has(name: string): boolean {
    return this._byName.has(name);
  }

  // ── Catalog ─────────────────────────────────────────────────────────────

  list(): Array<{ name: string; category: ToolCategory; description: string; terminal: boolean }> {
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

  get totalCount(): number {
    return this._byName.size;
  }

  // ── Metrics ─────────────────────────────────────────────────────────────

  getStats(): OrchestratorStats {
    const perTool = [...this._metrics.values()];
    const totalCalls     = perTool.reduce((s, m) => s + m.calls,     0);
    const totalSuccesses = perTool.reduce((s, m) => s + m.successes, 0);
    const totalFailures  = perTool.reduce((s, m) => s + m.failures,  0);

    const categoryCounts = {} as Record<ToolCategory, number>;
    for (const [cat, tools] of this._byCategory) {
      categoryCounts[cat] = tools.length;
    }

    return {
      totalTools:             this._byName.size,
      totalCalls,
      totalSuccesses,
      totalFailures,
      activeConcurrentCalls:  this._activeCalls,
      categoryCounts,
      perTool,
    };
  }

  getToolMetrics(name: string): ToolMetrics | undefined {
    return this._metrics.get(name);
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

  // ── Private helpers ─────────────────────────────────────────────────────

  private _validateArgs(tool: Tool, args: Record<string, unknown>): string | null {
    const required = tool.parameters.required ?? [];
    for (const field of required) {
      if (args[field] === undefined || args[field] === null) {
        return `ToolOrchestrator: "${tool.name}" missing required field: "${field}"`;
      }
    }
    return null;
  }

  private _withTimeout<T>(promise: Promise<T>, ms: number, name: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Tool "${name}" timed out after ${ms}ms`)),
        ms,
      );
      promise.then(
        (v) => { clearTimeout(timer); resolve(v); },
        (e) => { clearTimeout(timer); reject(e); },
      );
    });
  }

  private _recordMetric(name: string, ok: boolean, durationMs: number): void {
    const m = this._metrics.get(name);
    if (!m) return;
    m.calls++;
    if (ok) m.successes++; else m.failures++;
    m.totalDurationMs += durationMs;
    m.avgDurationMs    = Math.round(m.totalDurationMs / m.calls);
    m.lastCalledAt     = Date.now();
  }

  private _summariseArgs(name: string, args: Record<string, unknown>): unknown {
    if ((name === "file_write") && typeof args.content === "string")
      return { path: args.path, bytes: (args.content as string).length };
    if (name === "file_replace")
      return { path: args.path, old_bytes: (args.old_string as string)?.length, new_bytes: (args.new_string as string)?.length };
    if (["file_read", "file_delete", "file_list"].includes(name))
      return { path: args.path };
    if (name === "file_search")
      return { pattern: args.pattern, path: args.path, glob: args.glob };
    if (name === "shell_exec")
      return { command: args.command, args: args.args };
    if (name === "package_install")
      return { packages: args.packages, dev: args.dev };
    if (name === "env_write")
      return { key: args.key };
    if (name === "git_commit")
      return { message: args.message };
    if (name === "git_add")
      return { paths: args.paths ?? "all" };
    return args;
  }

  private _summariseResult(name: string, exec: ToolResult): unknown {
    if (!exec.ok) return { error: exec.error?.slice(0, 200) };
    const r = exec.result as Record<string, unknown> | undefined;
    if (!r) return { ok: true };
    if (name === "file_read")      return { path: r["path"], bytes: (r["content"] as string)?.length ?? 0 };
    if (name === "file_list")      return { count: (r["tree"] as string)?.split("\n").length ?? 0 };
    if (name === "file_search")    return { count: r["count"], truncated: r["truncated"] };
    if (name === "file_replace")   return { path: r["path"], replacements: r["replacements"] };
    if (name === "shell_exec")     return { exitCode: r["exitCode"] };
    if (name === "server_start" || name === "server_restart" || name === "preview_url") return r;
    if (name === "server_logs")    return { status: r["status"], lineCount: (r["lines"] as unknown[])?.length ?? 0 };
    if (name === "package_install") return { installed: r["installed"], exitCode: r["exitCode"] };
    if (name === "env_read")       return { path: r["path"], count: r["count"] };
    return { ok: true };
  }
}

// ── Singleton export ─────────────────────────────────────────────────────────

export const toolOrchestrator = new ToolOrchestrator(TOOL_REGISTRY);

// ── Re-export registry-compatible surface (drop-in replacement for registry.ts)

export const TOOLS     = TOOL_REGISTRY.map((e) => e.tool);
export const TOOL_DEFS = toolOrchestrator.toolDefs;

export function getTool(name: string): Tool | undefined {
  return toolOrchestrator.getTool(name);
}

export const TERMINAL_TOOL_NAMES = new Set<string>(
  TOOL_REGISTRY.filter((e) => e.terminal).map((e) => e.tool.name),
);

export type { ToolContext };

// ── Pipeline integration: runToolsOperation ──────────────────────────────────
// Called by the pipeline registry entry 'tools:orchestrator' (infrastructure
// domain). Provides a unified operation interface for the dispatch system.

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
      if (!inp.tool) throw new Error("[tools:orchestrator] execute — missing field: tool");
      if (!inp.ctx)  throw new Error("[tools:orchestrator] execute — missing field: ctx");
      return toolOrchestrator.execute(
        inp.tool,
        inp.args ?? {},
        inp.ctx as ToolContext,
      );
    }

    case "executeMany": {
      if (!inp.ctx)   throw new Error("[tools:orchestrator] executeMany — missing field: ctx");
      if (!inp.calls) throw new Error("[tools:orchestrator] executeMany — missing field: calls");
      return toolOrchestrator.executeMany(inp.calls, inp.ctx as ToolContext);
    }

    case "list":
      return toolOrchestrator.list();

    case "list-category": {
      if (!inp.category) throw new Error("[tools:orchestrator] list-category — missing field: category");
      return toolOrchestrator.getByCategory(inp.category as ToolCategory);
    }

    case "get": {
      if (!inp.tool) throw new Error("[tools:orchestrator] get — missing field: tool");
      return toolOrchestrator.getEntry(inp.tool) ?? null;
    }

    case "stats":
    default:
      return toolOrchestrator.getStats();
  }
}
