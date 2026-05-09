import type { Tool, ToolContext, ToolResult } from "../types.ts";
import { bus } from "../../../infrastructure/events/bus.ts";
import { v4 as uuidv4 } from "uuid";

export const taskComplete: Tool = {
  name: "task_complete",
  description: "Call ONCE when the goal is fully achieved. This ends the agent loop. Provide a clear summary of what was accomplished.",
  parameters: {
    type: "object",
    properties: {
      summary: { type: "string", description: "Summary of what was accomplished" },
    },
    required: ["summary"],
  },
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    bus.emit("agent.event", {
      runId: ctx.runId,
      eventType: "agent.message",
      phase: "complete",
      payload: { text: args.summary as string },
      ts: Date.now(),
    });
    return { ok: true, result: { complete: true, summary: args.summary } };
  },
};

export const agentMessage: Tool = {
  name: "agent_message",
  description: "Send a user-visible status message. Use sparingly for important progress updates.",
  parameters: {
    type: "object",
    properties: {
      text: { type: "string", description: "Message text to display to the user" },
      type: { type: "string", enum: ["info", "success", "warning", "error"], description: "Message type (default: info)" },
    },
    required: ["text"],
  },
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    bus.emit("agent.event", {
      runId: ctx.runId,
      eventType: "agent.message",
      phase: "tool-loop",
      payload: { text: args.text as string, type: args.type || "info" },
      ts: Date.now(),
    });
    return { ok: true, result: { sent: true, text: args.text } };
  },
};

export const agentQuestion: Tool = {
  name: "agent_question",
  description: "Ask the user a clarifying question and WAIT for their answer. Use ONLY when no sensible default exists. Provide 2-5 short options.",
  parameters: {
    type: "object",
    properties: {
      text: { type: "string", description: "The question to ask the user" },
      options: { type: "array", items: { type: "string" }, description: "2-5 short answer options" },
      default: { type: "string", description: "Default answer if user does not respond" },
    },
    required: ["text", "options"],
  },
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    const questionId = uuidv4();
    const defaultAnswer = (args.default as string) || (args.options as string[])[0] || "yes";

    bus.emit("agent.event", {
      runId: ctx.runId,
      eventType: "agent.question",
      phase: "tool-loop",
      payload: {
        questionId,
        text: args.text as string,
        options: args.options as string[],
        default: defaultAnswer,
      },
      ts: Date.now(),
    });

    return {
      ok: true,
      result: {
        questionId,
        question: args.text,
        options: args.options,
        answer: defaultAnswer,
        message: "Question sent to user. Using default answer to continue.",
      },
    };
  },
};
