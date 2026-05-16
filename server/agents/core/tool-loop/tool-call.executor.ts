/**
 * server/agents/core/tool-loop/tool-call.executor.ts
 *
 * Single-tool-call execution unit.
 * Handles: arg parsing → tool lookup → execute → observe → build message content.
 *
 * Extracted from tool-loop.agent.ts so the loop stays under 250 lines
 * and this concern has a single, testable home.
 */

import { toolOrchestrator, TERMINAL_TOOL_NAMES } from "../../../tools/orchestrator.ts";
import type { ToolContext }                       from "../../../tools/orchestrator.ts";
import { executionObserver }                      from "../../../tools/observation/index.ts";
import { bus }                                    from "../../../infrastructure/events/bus.ts";

// ── Public contract ────────────────────────────────────────────────────────────

export interface ToolCallInput {
  callId:   string;
  name:     string;
  args:     string; // raw JSON from LLM function-call arguments
  ctx:      ToolContext;
}

export interface ToolCallOutput {
  content:    string;                       // full message content for messages[]
  isTerminal: boolean;                      // was a terminal tool (task_complete) called?
  execOk:     boolean;                      // did the tool succeed?
  parsedArgs: Record<string, unknown>;      // needed by verification gate
}

// ── Executor ──────────────────────────────────────────────────────────────────

export async function executeToolCall(input: ToolCallInput): Promise<ToolCallOutput> {
  const { callId, name, args, ctx } = input;

  // ── 1. Parse args ─────────────────────────────────────────────────────────
  let parsedArgs: Record<string, unknown> = {};
  try {
    parsedArgs = args ? (JSON.parse(args) as Record<string, unknown>) : {};
  } catch {
    const err = `Tool ${name}: invalid JSON arguments`;
    emitError(ctx.runId, name, err);
    return { content: JSON.stringify({ ok: false, error: err }), isTerminal: false, execOk: false, parsedArgs };
  }

  // ── 2. Unknown tool guard ─────────────────────────────────────────────────
  if (!toolOrchestrator.has(name)) {
    const err = `Unknown tool: ${name}`;
    emitError(ctx.runId, name, err);
    return { content: JSON.stringify({ ok: false, error: err }), isTerminal: false, execOk: false, parsedArgs };
  }

  // ── 3. Execute ────────────────────────────────────────────────────────────
  const startTs    = Date.now();
  const result     = await toolOrchestrator.execute(name, parsedArgs, ctx);
  const durationMs = Date.now() - startTs;

  // ── 4. Observe ────────────────────────────────────────────────────────────
  // This is the T4 fix: observe produces a structured [OBSERVATION] block
  // that gets appended to the tool result so the LLM can reason about it.
  const observation = executionObserver.observe(name, result, ctx, startTs, durationMs);
  const content     = executionObserver.buildContent(result, observation);

  return {
    content,
    isTerminal: TERMINAL_TOOL_NAMES.has(name) && result.ok,
    execOk:     result.ok,
    parsedArgs,
  };
}

// ── Private ───────────────────────────────────────────────────────────────────

function emitError(runId: string, tool: string, error: string): void {
  bus.emit("agent.event", {
    runId,
    eventType: "agent.tool_call",
    phase:     "tool-loop",
    payload:   { tool, status: "error", error },
    ts:        Date.now(),
  });
}
