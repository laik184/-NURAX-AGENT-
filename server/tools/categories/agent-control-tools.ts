import type { Tool, ToolContext, ToolResult } from "../types.ts";
import { bus } from "../../infrastructure/events/bus.ts";
import { waitForAnswer } from "../../chat/run/question-bus.ts";
import { v4 as uuidv4 } from "uuid";

export const agentWait: Tool = {
  name: "agent_wait",
  description: "Pause the agent loop for a specified number of milliseconds. Use for polling or waiting on async side-effects.",
  parameters: {
    type: "object",
    properties: {
      ms: { type: "number", description: "Milliseconds to wait (max 10000)" },
    },
    required: ["ms"],
  },
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    const ms = Math.min((args.ms as number) || 1000, 10_000);
    await new Promise((resolve) => setTimeout(resolve, ms));
    return { ok: true, result: { waited: ms } };
  },
};

export const agentAskUser: Tool = {
  name: "agent_ask_user",
  description: "Ask the user a clarifying question and wait for their answer. Use when a decision requires human input. Returns the user's response.",
  parameters: {
    type: "object",
    properties: {
      question:    { type: "string", description: "Question to ask the user" },
      context:     { type: "string", description: "Optional context or options to help the user answer" },
      timeoutMs:   { type: "number", description: "Max wait time in ms (default 120000, max 300000)" },
    },
    required: ["question"],
  },
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    const question  = args.question as string;
    const context   = (args.context as string) || "";
    const timeoutMs = Math.min((args.timeoutMs as number) || 120_000, 300_000);
    const questionId = uuidv4();

    bus.emit("agent:question", {
      projectId:  ctx.projectId,
      runId:      ctx.runId,
      questionId,
      question,
      context,
    });

    try {
      const answer = await waitForAnswer(questionId, timeoutMs);
      return { ok: true, result: { question, answer, answered: true } };
    } catch {
      return { ok: false, error: "User did not respond within the timeout window." };
    }
  },
};

export const agentEmitEvent: Tool = {
  name: "agent_emit_event",
  description: "Emit a custom event on the internal event bus. Used for coordinating between agent runs or triggering webhooks.",
  parameters: {
    type: "object",
    properties: {
      event:   { type: "string", description: "Event name to emit" },
      payload: { type: "object", description: "Payload data (JSON serializable)" },
    },
    required: ["event"],
  },
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    const eventName = args.event as string;
    const payload   = (args.payload as Record<string, unknown>) || {};
    bus.emit(eventName as any, { ...payload, projectId: ctx.projectId, runId: ctx.runId });
    return { ok: true, result: { emitted: eventName, payload } };
  },
};

export const agentThink: Tool = {
  name: "agent_think",
  description: "Internal reasoning scratch-pad. Use to reason step-by-step before acting. Does not call any external system — just logs the thought.",
  parameters: {
    type: "object",
    properties: {
      thought: { type: "string", description: "Your reasoning or plan" },
    },
    required: ["thought"],
  },
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    return { ok: true, result: { logged: true, thought: args.thought } };
  },
};

export const agentFail: Tool = {
  name: "agent_fail",
  description: "Terminate the current agent run with a clear failure message. Use when the goal cannot be completed safely.",
  parameters: {
    type: "object",
    properties: {
      reason: { type: "string", description: "Human-readable reason for failing" },
    },
    required: ["reason"],
  },
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    bus.emit("agent:failed", { projectId: ctx.projectId, runId: ctx.runId, reason: args.reason });
    return { ok: false, error: args.reason as string };
  },
};
