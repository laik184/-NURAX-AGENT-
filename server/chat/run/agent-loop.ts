/**
 * @deprecated
 * This file is a backward-compatibility re-export.
 * The agent has moved to server/agents/core/tool-loop/
 * All new code should import from there directly.
 */
export { runAgentLoop, TOOL_NAMES } from "../../agents/core/tool-loop/index.ts";
export type { AgentLoopInput, AgentLoopResult } from "../../agents/core/tool-loop/index.ts";
