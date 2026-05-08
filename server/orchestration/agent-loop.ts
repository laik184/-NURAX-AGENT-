import { llm, type ToolMessage } from "../llm/openrouter.client.ts";
import { TOOLS, TOOL_DEFS, getTool, TERMINAL_TOOL_NAMES, type ToolContext } from "../tools/registry.ts";
import { bus } from "../infrastructure/events/bus.ts";
import { buildSystemPrompt } from "../agents/core/llm/prompt-builder/agents/system-prompt.agent.js";
import { TOOL_REFERENCE } from "./tool-reference.ts";

export interface AgentLoopInput {
  readonly projectId: number;
  readonly runId: string;
  readonly goal: string;
  readonly maxSteps?: number;
  readonly signal?: AbortSignal;
  readonly systemPrompt?: string;
}

export interface AgentLoopResult {
  readonly success: boolean;
  readonly steps: number;
  readonly summary: string;
  readonly stopReason: "complete" | "max_steps" | "no_tool_calls" | "error" | "aborted";
  readonly error?: string;
}


export async function runAgentLoop(input: AgentLoopInput): Promise<AgentLoopResult> {
  const maxSteps = input.maxSteps ?? 25;
  const resolvedSystemPrompt = buildSystemPrompt(input.systemPrompt) + "\n\n" + TOOL_REFERENCE;
  const messages: ToolMessage[] = [
    { role: "system", content: resolvedSystemPrompt },
    {
      role: "user",
      content: `Project ID: ${input.projectId}\nGoal:\n${input.goal}`,
    },
  ];

  const ctx: ToolContext = {
    projectId: input.projectId,
    runId: input.runId,
    signal: input.signal,
  };

  emit(input.runId, "agent.thinking", "tool-loop", { text: `Starting agent loop for: ${input.goal.slice(0, 200)}` });

  let steps = 0;
  let lastSummary = "";

  while (steps < maxSteps) {
    if (input.signal?.aborted) {
      return { success: false, steps, summary: "Aborted by user.", stopReason: "aborted" };
    }
    steps++;
    emit(input.runId, "agent.thinking", "tool-loop", { step: steps, text: `Step ${steps}: thinking…` });

    let response: Awaited<ReturnType<typeof llm.chatWithTools>>;
    try {
      response = await llm.chatWithTools(messages, [...TOOL_DEFS], { signal: input.signal });
    } catch (e: any) {
      const msg = e?.message || String(e);
      emit(input.runId, "agent.message", "error", { text: `LLM error: ${msg}` });
      return { success: false, steps, summary: msg, stopReason: "error", error: msg };
    }

    // Surface assistant text immediately
    if (response.content && response.content.trim()) {
      emit(input.runId, "agent.message", "tool-loop", { text: response.content });
    }

    // No tool calls = the model thinks it's done. Use its text as the summary.
    if (response.toolCalls.length === 0) {
      const summary = response.content?.trim() || lastSummary || "Done.";
      emit(input.runId, "agent.message", "complete", { text: summary });
      return { success: true, steps, summary, stopReason: "no_tool_calls" };
    }

    // Append assistant message with tool_calls so the model sees its own choices
    messages.push({
      role: "assistant",
      content: response.content || "",
      tool_calls: response.toolCalls.map((tc) => ({
        id: tc.id,
        type: "function" as const,
        function: { name: tc.name, arguments: tc.arguments },
      })),
    });

    let saw_complete = false;

    // Execute every tool call sequentially (simpler + safer than parallel)
    for (const call of response.toolCalls) {
      const tool = getTool(call.name);
      let parsedArgs: Record<string, unknown> = {};
      try {
        parsedArgs = call.arguments ? JSON.parse(call.arguments) : {};
      } catch {
        const err = `Tool ${call.name}: invalid JSON arguments`;
        emit(input.runId, "agent.tool_call", "tool-loop", { tool: call.name, status: "error", error: err });
        messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify({ ok: false, error: err }) });
        continue;
      }

      if (!tool) {
        const err = `Unknown tool: ${call.name}`;
        emit(input.runId, "agent.tool_call", "tool-loop", { tool: call.name, status: "error", error: err });
        messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify({ ok: false, error: err }) });
        continue;
      }

      emit(input.runId, "agent.tool_call", "tool-loop", {
        tool: call.name,
        status: "running",
        args: summariseArgs(call.name, parsedArgs),
      });

      let exec;
      try {
        exec = await tool.run(parsedArgs, ctx);
      } catch (e: any) {
        exec = { ok: false, error: e?.message || String(e) };
      }

      emit(input.runId, "agent.tool_call", "tool-loop", {
        tool: call.name,
        status: exec.ok ? "done" : "error",
        result: summariseResult(call.name, exec),
        error: exec.error,
      });

      // Trim large tool result content so we don't blow the LLM context window
      const resultJson = JSON.stringify(exec);
      const trimmed = resultJson.length > 10_000
        ? resultJson.slice(0, 5000) + ' ... [truncated] ... ' + resultJson.slice(-2000)
        : resultJson;
      messages.push({ role: "tool", tool_call_id: call.id, content: trimmed });

      if (TERMINAL_TOOL_NAMES.has(call.name) && exec.ok) {
        saw_complete = true;
        const summary = (parsedArgs.summary as string) || "Task complete.";
        lastSummary = summary;
      }
    }

    if (saw_complete) {
      return { success: true, steps, summary: lastSummary, stopReason: "complete" };
    }
  }

  return {
    success: false,
    steps,
    summary: `Reached step limit of ${maxSteps} without completing.`,
    stopReason: "max_steps",
  };
}

function emit(runId: string, eventType: string, phase: string, payload: unknown): void {
  bus.emit("agent.event", {
    runId,
    eventType: eventType as any,
    phase,
    ts: Date.now(),
    payload,
  });
}

function summariseArgs(tool: string, args: Record<string, unknown>): unknown {
  if (tool === "file_write" && typeof args.content === "string") {
    return { path: args.path, bytes: (args.content as string).length };
  }
  if (tool === "file_replace") {
    return { path: args.path, old_bytes: (args.old_string as string)?.length, new_bytes: (args.new_string as string)?.length };
  }
  if (tool === "file_read" || tool === "file_delete" || tool === "file_list") {
    return { path: args.path };
  }
  if (tool === "file_search") {
    return { pattern: args.pattern, path: args.path, glob: args.glob };
  }
  if (tool === "shell_exec") {
    return { command: args.command, args: args.args };
  }
  if (tool === "package_install") {
    return { packages: args.packages, dev: args.dev };
  }
  if (tool === "env_write") {
    return { key: args.key, path: args.path };   // never surface value — may be a secret
  }
  if (tool === "git_commit") {
    return { message: args.message };
  }
  if (tool === "git_add") {
    return { paths: args.paths ?? "all" };
  }
  return args;
}

function summariseResult(tool: string, exec: { ok: boolean; result?: unknown; error?: string }): unknown {
  if (!exec.ok) return { error: exec.error?.slice(0, 200) };
  if (tool === "file_read" && exec.result && typeof exec.result === "object") {
    const r = exec.result as { path?: string; content?: string };
    return { path: r.path, bytes: r.content?.length ?? 0 };
  }
  if (tool === "file_list") return { ok: true };
  if (tool === "file_search" && exec.result && typeof exec.result === "object") {
    const r = exec.result as { count?: number; truncated?: boolean };
    return { count: r.count, truncated: r.truncated };
  }
  if (tool === "file_replace" && exec.result && typeof exec.result === "object") {
    const r = exec.result as { path?: string; replacements?: number };
    return { path: r.path, replacements: r.replacements };
  }
  if (tool === "shell_exec" && exec.result && typeof exec.result === "object") {
    const r = exec.result as { exitCode?: number };
    return { exitCode: r.exitCode };
  }
  if (tool === "server_start" || tool === "server_restart" || tool === "preview_url") return exec.result;
  if (tool === "server_logs" && exec.result && typeof exec.result === "object") {
    const r = exec.result as { lines?: string[]; status?: string };
    return { status: r.status, lineCount: r.lines?.length ?? 0 };
  }
  if (tool === "detect_missing_packages") return exec.result;
  if (tool === "package_install" && exec.result && typeof exec.result === "object") {
    const r = exec.result as { installed?: string[]; exitCode?: number };
    return { installed: r.installed, exitCode: r.exitCode };
  }
  if (tool === "env_read" && exec.result && typeof exec.result === "object") {
    const r = exec.result as { count?: number; path?: string };
    return { path: r.path, count: r.count };
  }
  if (tool === "env_write" || tool === "git_status" || tool === "git_add" || tool === "git_commit") {
    return exec.result;
  }
  return { ok: true };
}

export const TOOL_NAMES = TOOLS.map((t) => t.name);
