import { bus } from "../../events/bus.ts";
import { waitForAnswer } from "../../orchestration/question-bus.ts";
import type { Tool } from "../types.ts";
import { asString } from "../util.ts";

export const taskComplete: Tool = {
  name: "task_complete",
  description:
    "Call this when the user's goal is fully achieved. Provide a short summary of what you built or fixed. After this the agent loop ends.",
  parameters: {
    type: "object",
    properties: { summary: { type: "string", description: "Short summary of the result for the user." } },
    required: ["summary"],
  },
  async run(args, ctx) {
    const summary = asString(args.summary, "summary");
    bus.emit("agent.event", {
      runId: ctx.runId,
      eventType: "agent.message",
      phase: "complete",
      ts: Date.now(),
      payload: { text: summary },
    });
    return { ok: true, result: { summary, complete: true } };
  },
};

export const agentMessage: Tool = {
  name: "agent_message",
  description:
    "Send a visible chat message to the user (e.g. status updates). Use sparingly — the user already sees your tool calls.",
  parameters: {
    type: "object",
    properties: { text: { type: "string" } },
    required: ["text"],
  },
  async run(args, ctx) {
    const text = asString(args.text, "text");
    bus.emit("agent.event", {
      runId: ctx.runId,
      eventType: "agent.message",
      phase: "tool",
      ts: Date.now(),
      payload: { text },
    });
    return { ok: true, result: { delivered: true } };
  },
};

export const agentQuestion: Tool = {
  name: "agent_question",
  description:
    "Ask the user a clarifying question and WAIT for their response before continuing. Use when you genuinely cannot proceed without a user choice (e.g. which database, which framework, which color theme). Provide 2–5 short option labels. The agent loop is suspended until the user clicks an option.",
  parameters: {
    type: "object",
    properties: {
      text: {
        type: "string",
        description: "The question to display to the user.",
      },
      options: {
        type: "array",
        items: { type: "string" },
        description: "2–5 short option labels the user can click.",
      },
    },
    required: ["text", "options"],
  },
  async run(args, ctx) {
    const text = asString(args.text, "text");
    const options = Array.isArray(args.options) ? (args.options as string[]) : [];
    if (options.length < 2) {
      return { ok: false, error: "agent_question requires at least 2 options" };
    }

    const questionId = `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // Broadcast question to frontend via SSE
    bus.emit("agent.event", {
      runId: ctx.runId,
      eventType: "agent.question",
      phase: "waiting",
      ts: Date.now(),
      payload: { text, options, questionId },
    });

    // Suspend loop until user answers (or default to first option after 5 min)
    const answer = await waitForAnswer(ctx.runId, questionId, options[0]);

    // Acknowledge the user's choice back in chat
    bus.emit("agent.event", {
      runId: ctx.runId,
      eventType: "agent.message",
      phase: "tool",
      ts: Date.now(),
      payload: { text: `✔ Got it — proceeding with: **${answer}**` },
    });

    return { ok: true, result: { answer } };
  },
};

export const AGENT_CONTROL_TOOLS: readonly Tool[] = Object.freeze([
  taskComplete,
  agentMessage,
  agentQuestion,
]);
