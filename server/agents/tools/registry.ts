/**
 * server/agents/tools/registry.ts
 *
 * Legacy compatibility shim.
 *
 * The tool list is now owned exclusively by server/tools/registry/tool-catalog.ts
 * and the unified registry singleton. This file re-exports the same surface so
 * all existing imports continue to work unchanged.
 */

export {
  TOOLS,
  TOOL_DEFS,
  TERMINAL_TOOL_NAMES,
  getTool,
} from "./orchestrator.ts";

export type { ToolContext } from "./types.ts";
