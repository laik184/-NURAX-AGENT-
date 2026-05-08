/**
 * server/agents/core/tool-loop
 *
 * The LLM tool-use agent — the core AI execution loop.
 * This is where the agent calls OpenRouter and uses sandbox tools
 * to accomplish goals step-by-step.
 *
 * Controlled by server/chat/pipeline/tool-loop-runner.ts which handles
 * DB writes, event emission, and lifecycle management.
 */

export { runAgentLoop, TOOL_NAMES } from "./tool-loop.agent.ts";
export type { AgentLoopInput, AgentLoopResult } from "./tool-loop.agent.ts";
export { TOOL_REFERENCE } from "./tool-reference.ts";
