/**
 * context-compressor.ts
 *
 * Compresses an accumulated tool-loop message history into a lean context
 * safe to hand to a continuation run of runAgentLoop.
 *
 * Strategy:
 *   1. Always keep messages[0] (system prompt).
 *   2. Inject a single "progress summary" user message describing what happened.
 *   3. Keep the last RECENCY_WINDOW messages verbatim (recent tool calls / results).
 *
 * This prevents token explosion across continuations while preserving enough
 * context for the agent to resume coherently without repeating completed work.
 */

import type { ToolMessage } from "../../../../llm/openrouter.client.ts";

/** Number of recent messages to keep verbatim for recency context. */
const RECENCY_WINDOW = 6;

/** Max number of summarised action lines to include in the progress block. */
const MAX_SUMMARY_LINES = 20;

export interface CompressionInput {
  messages: ToolMessage[];
  originalGoal: string;
  stepsTaken: number;
  continuationCount: number;
}

export interface CompressionResult {
  messages: ToolMessage[];
  summaryText: string;
}

/**
 * Scan the middle of the message history (between system/user and the recency
 * window) and extract a compact progress summary.
 */
function extractProgressSummary(messages: ToolMessage[]): string {
  const middleStart = 2;
  const middleEnd = Math.max(middleStart, messages.length - RECENCY_WINDOW);
  const middle = messages.slice(middleStart, middleEnd);

  if (middle.length === 0) return "No prior tool interactions to summarize.";

  const lines: string[] = [];

  for (const m of middle) {
    if (m.role === "assistant" && m.content?.trim()) {
      lines.push(`Agent: ${m.content.trim().slice(0, 200)}`);
    }
    if (m.role === "tool" && m.content) {
      try {
        const parsed = JSON.parse(m.content) as {
          ok?: boolean;
          result?: unknown;
          error?: string;
        };
        if (!parsed.ok && parsed.error) {
          lines.push(`Tool error: ${parsed.error.slice(0, 150)}`);
        } else {
          lines.push("Tool: ok");
        }
      } catch {
        lines.push(`Tool result: ${m.content.slice(0, 100)}`);
      }
    }
  }

  return lines.length > 0
    ? lines.slice(-MAX_SUMMARY_LINES).join("\n")
    : "Prior work completed — continuing below.";
}

/**
 * Compress a full message history into a smaller context suitable for a
 * continuation run.  Always returns at least a system message + summary.
 */
export function compressMessages(input: CompressionInput): CompressionResult {
  const { messages, originalGoal, stepsTaken, continuationCount } = input;

  if (messages.length === 0) {
    return { messages: [], summaryText: "" };
  }

  const systemMessage = messages[0];
  const recentMessages = messages.slice(Math.max(2, messages.length - RECENCY_WINDOW));
  const progressSummary = extractProgressSummary(messages);

  const summaryText = [
    `=== CONTINUATION ${continuationCount} ===`,
    `Original goal: ${originalGoal.slice(0, 500)}`,
    `Steps completed in previous run: ${stepsTaken}`,
    "",
    "PROGRESS SUMMARY (what was done):",
    progressSummary,
    "",
    "=== RESUME INSTRUCTIONS ===",
    "You hit the step limit. The above summarizes your progress so far.",
    "Resume and complete the ORIGINAL GOAL. Do NOT repeat work already done.",
    "When fully done, call task_complete with a summary.",
  ].join("\n");

  const compressed: ToolMessage[] = [
    systemMessage,
    { role: "user", content: summaryText },
    ...recentMessages,
  ];

  return { messages: compressed, summaryText };
}
