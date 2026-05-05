import { llm, type ToolMessage } from "../llm/openrouter.client.ts";
import { TOOLS, TOOL_DEFS, getTool, TERMINAL_TOOL_NAMES, type ToolContext } from "../tools/registry.ts";
import { bus } from "../infrastructure/events/bus.ts";
import { buildSystemPrompt } from "../agents/core/llm/prompt-builder/agents/system-prompt.agent.js";

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

const TOOL_REFERENCE = `
You operate inside a per-user sandbox at the project root. You have these tools:

- file_list({path?, maxDepth?}) → directory tree
- file_read({path}) → file content
- file_write({path, content}) → create or overwrite a file (creates parent dirs)
- file_delete({path}) → delete file or directory
- shell_exec({command, args?, timeoutMs?}) → run an allow-listed binary (npm, npx, node, git, tsx, vite, ls, cat, head, tail, echo, mkdir, touch, grep, find, python). NO shell metacharacters in args.
- package_install({packages, dev?}) → npm install (empty array = npm install with existing package.json)
- server_start({}) / server_stop({}) / server_restart({}) → control the dev server. Returns the preview URL path.
- server_logs({tail?}) → recent dev-server stdout/stderr (use to find runtime errors)
- detect_missing_packages({}) → scan logs for "Cannot find module X" and return missing npm package names
- agent_message({text}) → user-visible status message (sparingly)
- agent_question({text, options}) → ask the user a clarifying question and WAIT for their answer. Use ONLY when you cannot make a sensible default choice (e.g. "PostgreSQL or MySQL?"). Provide 2–5 short option strings. The loop pauses until the user clicks.
- task_complete({summary}) → call ONCE when the goal is done; this ends the loop

TOOL RULES:
- Always work INSIDE the sandbox; never assume files outside the project root.
- For a brand-new project: create package.json with {"scripts":{"dev":"..."}} so server_start works.
- For React/Vite apps: prefer Vite + React + TypeScript; entry index.html; src/main.tsx; vite.config.ts must use \`server: { host: "0.0.0.0", port: Number(process.env.PORT) || 5173, allowedHosts: true }\` so the preview iframe works.
- For Express/Node apps: bind to \`process.env.PORT\` and \`0.0.0.0\`.
- Keep individual file_write calls focused (one file per call).
- After install + restart, ALWAYS check server_logs to confirm it actually started; fix errors before declaring done.
- Be concise; the user sees every tool call live.
- Only call agent_question when there is genuinely no good default (e.g. which paid service to use). For everything else, make a reasonable choice and proceed without asking.
- When the goal is achieved, call task_complete({summary}). Do not output a long final message — task_complete IS the final message.`;

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
  // Don't ship full file contents through SSE — UI doesn't need them
  if (tool === "file_write" && typeof args.content === "string") {
    return { path: args.path, bytes: (args.content as string).length };
  }
  if (tool === "file_read" || tool === "file_delete" || tool === "file_list") {
    return { path: args.path };
  }
  if (tool === "shell_exec") {
    return { command: args.command, args: args.args };
  }
  if (tool === "package_install") {
    return { packages: args.packages, dev: args.dev };
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
  if (tool === "shell_exec" && exec.result && typeof exec.result === "object") {
    const r = exec.result as { exitCode?: number };
    return { exitCode: r.exitCode };
  }
  if (tool === "server_start" || tool === "server_restart") return exec.result;
  if (tool === "server_logs" && exec.result && typeof exec.result === "object") {
    const r = exec.result as { lines?: string[]; status?: string };
    return { status: r.status, lineCount: r.lines?.length ?? 0 };
  }
  if (tool === "detect_missing_packages") return exec.result;
  if (tool === "package_install" && exec.result && typeof exec.result === "object") {
    const r = exec.result as { installed?: string[]; exitCode?: number };
    return { installed: r.installed, exitCode: r.exitCode };
  }
  return { ok: true };
}

export const TOOL_NAMES = TOOLS.map((t) => t.name);
