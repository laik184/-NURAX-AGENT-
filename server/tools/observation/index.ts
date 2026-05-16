/**
 * server/tools/observation/index.ts
 *
 * ExecutionObserver — the single public entry point for the
 * Observable Execution Engine.
 *
 * Called by the tool-loop after every tool execution to produce a
 * structured observation that is injected into the LLM context.
 *
 * FLOW:
 *   toolOrchestrator.execute(name, args, ctx)
 *     → ExecutionObserver.observe(...)
 *     → ExecutionObservation { contextBlock, recommendation, ... }
 *     → injected into messages[] as suffix of tool result
 */

import type { ToolResult } from "../registry/tool-types.ts";
import type { ToolContext } from "../registry/tool-types.ts";
import type { ExecutionObservation } from "./types.ts";
import { buildObservation, buildObservableContent } from "./observation-builder.ts";
import { executionMemory } from "./memory/execution-memory.ts";
import { bus } from "../../infrastructure/events/bus.ts";

export { executionMemory };
export type { ExecutionObservation };

// ── ExecutionObserver singleton ───────────────────────────────────────────────

class ExecutionObserver {
  /**
   * Produce a structured observation after a tool execution.
   *
   * @param toolName  - name of the tool that was called
   * @param result    - the ToolResult returned by toolOrchestrator.execute()
   * @param ctx       - tool execution context (projectId, runId)
   * @param startTs   - timestamp BEFORE tool.run() was called (ms since epoch)
   * @param durationMs - how long execution took
   */
  observe(
    toolName:    string,
    result:      ToolResult,
    ctx:         ToolContext,
    startTs:     number,
    durationMs:  number,
  ): ExecutionObservation {
    const memory = executionMemory.summarise(ctx.runId);

    const observation = buildObservation(
      toolName, result, ctx.projectId, startTs, durationMs, memory,
    );

    // Record into run memory
    executionMemory.record(
      ctx.runId,
      toolName,
      result.ok,
      observation.failureClass,
      result.error ?? null,
      durationMs,
      observation.recommendation,
    );

    // Emit to bus so UI/SSE consumers can show real-time observation events
    bus.emit("agent.event", {
      runId:      ctx.runId,
      projectId:  ctx.projectId,
      eventType:  "tool.observation",
      phase:      "observation",
      payload: {
        toolName,
        ok:           observation.ok,
        failureClass: observation.failureClass,
        recommendation: observation.recommendation,
        durationMs,
        hasErrors:    observation.errorLines.length > 0,
        runtimeHealth: observation.runtimeHealth,
      },
      ts: Date.now(),
    });

    return observation;
  }

  /**
   * Build the full content string for the tool message pushed to LLM history.
   * Combines raw JSON result + [OBSERVATION] block.
   */
  buildContent(result: ToolResult, observation: ExecutionObservation): string {
    return buildObservableContent(result, observation);
  }

  /** Release run memory after the agent loop ends. */
  release(runId: string): void {
    executionMemory.release(runId);
  }
}

export const executionObserver = new ExecutionObserver();
