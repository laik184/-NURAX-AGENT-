/**
 * tool-loop.agent.ts
 *
 * THE LLM TOOL-USE AGENT.
 *
 * Calls OpenRouter (llm.chatWithTools) in a step-by-step loop,
 * invoking sandbox tools until task_complete is called or max steps reached.
 *
 * ── Verification gate ──────────────────────────────────────────────────────
 * When the LLM calls task_complete, the loop does NOT immediately return
 * success. Instead it runs the verification engine:
 *
 *   1. Check runtime process + logs
 *   2. Check TypeScript errors
 *   3. Check package install failures
 *   4. Check preview HTTP reachability
 *
 * If all checks pass → accept task_complete → return success.
 * If any check fails → replace the task_complete tool result in message
 *   history with { ok: false, issues: [...] } so the LLM sees the failure
 *   and must self-heal before calling task_complete again.
 * After MAX_VERIFICATION_RETRIES failed attempts → allow completion with
 *   a warning so the run does not loop indefinitely.
 */

import { llm, type ToolMessage }    from "../../../llm/openrouter.client.ts";
import {
  TOOLS, TOOL_DEFS, TERMINAL_TOOL_NAMES,
  type ToolContext, toolOrchestrator,
}                                    from "../../../tools/orchestrator.ts";
import { bus }                       from "../../../infrastructure/events/bus.ts";
import { buildSystemPrompt }         from "../llm/prompt-builder/agents/system-prompt.agent.js";
import { TOOL_REFERENCE }            from "./tool-reference.ts";
import { withRetry }                 from "./retry.ts";
import {
  runVerificationEngine,
  buildVerificationFeedback,
  buildExhaustedFeedback,
  getOrCreateRetryController,
  releaseRetryController,
  emitVerificationStarted,
  emitVerificationPassed,
  emitVerificationFailed,
  emitVerificationExhausted,
}                                    from "../../../verification/index.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AgentLoopInput {
  readonly projectId:      number;
  readonly runId:          string;
  readonly goal:           string;
  readonly maxSteps?:      number;
  readonly signal?:        AbortSignal;
  readonly systemPrompt?:  string;
  readonly initialMessages?: ToolMessage[];
  /** Disable verification gate (e.g. recovery runs that just restart a server). */
  readonly skipVerification?: boolean;
}

export interface AgentLoopResult {
  readonly success:    boolean;
  readonly steps:      number;
  readonly summary:    string;
  readonly stopReason: "complete" | "max_steps" | "no_tool_calls" | "error" | "aborted";
  readonly error?:     string;
  readonly messages?:  ToolMessage[];
}

// ─── Agent loop ───────────────────────────────────────────────────────────────

export async function runAgentLoop(input: AgentLoopInput): Promise<AgentLoopResult> {
  const maxSteps = input.maxSteps ?? 25;
  const resolvedSystemPrompt = buildSystemPrompt(input.systemPrompt) + "\n\n" + TOOL_REFERENCE;
  const messages: ToolMessage[] = input.initialMessages ?? [
    { role: "system", content: resolvedSystemPrompt },
    { role: "user",   content: `Project ID: ${input.projectId}\nGoal:\n${input.goal}` },
  ];

  const ctx: ToolContext = {
    projectId: input.projectId,
    runId:     input.runId,
    signal:    input.signal,
  };

  // One retry controller per run — tracks verification attempt count
  const retryCtrl = input.skipVerification
    ? null
    : getOrCreateRetryController(input.runId);

  emit(input.runId, "agent.thinking", "tool-loop", {
    text: `Starting agent loop for: ${input.goal.slice(0, 200)}`,
  });

  let steps       = 0;
  let lastSummary = "";

  try {
    while (steps < maxSteps) {
      if (input.signal?.aborted) {
        return { success: false, steps, summary: "Aborted by user.", stopReason: "aborted" };
      }

      steps++;
      emit(input.runId, "agent.thinking", "tool-loop", { step: steps, text: `Step ${steps}: thinking…` });

      // ── LLM call with retry ──────────────────────────────────────────────
      let response: Awaited<ReturnType<typeof llm.chatWithTools>>;
      try {
        response = await withRetry(
          () => llm.chatWithTools(messages, [...TOOL_DEFS], { signal: input.signal }),
          { maxAttempts: 3, runId: input.runId, operationName: "llm.chatWithTools", signal: input.signal },
        );
      } catch (e: any) {
        const msg = e?.message || String(e);
        emit(input.runId, "agent.message", "error", { text: `LLM error (all retries exhausted): ${msg}` });
        return { success: false, steps, summary: msg, stopReason: "error", error: msg };
      }

      if (response.content?.trim()) {
        emit(input.runId, "agent.message", "tool-loop", { text: response.content });
      }

      if (response.toolCalls.length === 0) {
        const summary = response.content?.trim() || lastSummary || "Done.";
        emit(input.runId, "agent.message", "complete", { text: summary });
        return { success: true, steps, summary, stopReason: "no_tool_calls" };
      }

      messages.push({
        role: "assistant",
        content: response.content || "",
        tool_calls: response.toolCalls.map((tc) => ({
          id:       tc.id,
          type:     "function" as const,
          function: { name: tc.name, arguments: tc.arguments },
        })),
      });

      let saw_complete = false;

      // ── Tool call loop ───────────────────────────────────────────────────
      for (const call of response.toolCalls) {
        let parsedArgs: Record<string, unknown> = {};
        try {
          parsedArgs = call.arguments ? JSON.parse(call.arguments) : {};
        } catch {
          const err = `Tool ${call.name}: invalid JSON arguments`;
          emit(input.runId, "agent.tool_call", "tool-loop", { tool: call.name, status: "error", error: err });
          messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify({ ok: false, error: err }) });
          continue;
        }

        if (!toolOrchestrator.has(call.name)) {
          const err = `Unknown tool: ${call.name}`;
          emit(input.runId, "agent.tool_call", "tool-loop", { tool: call.name, status: "error", error: err });
          messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify({ ok: false, error: err }) });
          continue;
        }

        const exec     = await toolOrchestrator.execute(call.name, parsedArgs, ctx);
        const resultJson = JSON.stringify(exec);
        const trimmed  = resultJson.length > 10_000
          ? resultJson.slice(0, 5000) + " ... [truncated] ... " + resultJson.slice(-2000)
          : resultJson;

        messages.push({ role: "tool", tool_call_id: call.id, content: trimmed });

        // ── Verification gate — only on task_complete ──────────────────────
        if (TERMINAL_TOOL_NAMES.has(call.name) && exec.ok) {
          const summary = (parsedArgs.summary as string) || "Task complete.";

          if (!retryCtrl) {
            // Verification skipped (recovery runs, etc.)
            saw_complete = true;
            lastSummary  = summary;
            continue;
          }

          emitVerificationStarted(input.projectId, input.runId);
          const report = await runVerificationEngine(input.projectId, input.runId);

          if (report.passed) {
            // ✅ All checks passed — accept completion
            emitVerificationPassed(report);
            saw_complete = true;
            lastSummary  = summary;
          } else if (retryCtrl.exhausted) {
            // ⚠️ Max retries reached — complete with warning to avoid infinite loop
            emitVerificationExhausted(input.projectId, input.runId, retryCtrl.maxRetries);
            const exhaustedContent = buildExhaustedFeedback(report, retryCtrl.maxRetries);
            // Replace last tool message with exhausted feedback
            messages[messages.length - 1] = {
              role: "tool",
              tool_call_id: call.id,
              content: exhaustedContent,
            };
            saw_complete = true;
            lastSummary  = `${summary} (completed with verification warnings — see issues)`;
          } else {
            // ❌ Verification failed — inject failure back so LLM self-heals
            const attempt  = retryCtrl.recordAttempt();
            emitVerificationFailed(report, attempt);
            const failContent = buildVerificationFeedback(report, attempt, retryCtrl.maxRetries);
            // Replace last tool message: task_complete appears as "failed"
            messages[messages.length - 1] = {
              role: "tool",
              tool_call_id: call.id,
              content: failContent,
            };
            // saw_complete stays false → loop continues → LLM must fix issues
          }
        }
      }

      if (saw_complete) {
        return { success: true, steps, summary: lastSummary, stopReason: "complete" };
      }
    }

    return {
      success:    false,
      steps,
      summary:    `Reached step limit of ${maxSteps} without completing.`,
      stopReason: "max_steps",
      messages,
    };

  } finally {
    // Always release per-run retry state to avoid memory leak
    releaseRetryController(input.runId);
  }
}

// ─── Emit helper ──────────────────────────────────────────────────────────────

function emit(runId: string, eventType: string, phase: string, payload: unknown): void {
  bus.emit("agent.event", {
    runId,
    eventType: eventType as any,
    phase,
    ts:      Date.now(),
    payload,
  });
}

// ─── Re-exports ───────────────────────────────────────────────────────────────

export const TOOL_NAMES = TOOLS.map((t) => t.name);
export { toolOrchestrator };
