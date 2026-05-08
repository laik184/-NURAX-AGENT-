import type { ToolDef } from "../llm/openrouter.client.ts";
import { AGENT_CONTROL_TOOLS } from "./categories/agent-control-tools.ts";
import { DIAGNOSTIC_TOOLS } from "./categories/diagnostic-tools.ts";
import { FILE_TOOLS } from "./categories/file-tools.ts";
import { FILE_SEARCH_TOOLS } from "./categories/file-search-tools.ts";
import { PACKAGE_TOOLS } from "./categories/package-tools.ts";
import { PREVIEW_TOOLS } from "./categories/preview-tools.ts";
import { ENV_TOOLS } from "./categories/env-tools.ts";
import { GIT_TOOLS } from "./categories/git-tools.ts";
import { SERVER_LIFECYCLE_TOOLS } from "./categories/server-lifecycle-tools.ts";
import { SHELL_TOOLS } from "./categories/shell-tools.ts";
import type { Tool, ToolContext, ToolExecution } from "./types.ts";

export type { Tool, ToolContext, ToolExecution } from "./types.ts";

export const TOOLS: ReadonlyArray<Tool> = Object.freeze([
  ...FILE_TOOLS,
  ...FILE_SEARCH_TOOLS,
  ...SHELL_TOOLS,
  ...PACKAGE_TOOLS,
  ...SERVER_LIFECYCLE_TOOLS,
  ...DIAGNOSTIC_TOOLS,
  ...PREVIEW_TOOLS,
  ...ENV_TOOLS,
  ...GIT_TOOLS,
  ...AGENT_CONTROL_TOOLS,
]);

export const TOOL_DEFS: ReadonlyArray<ToolDef> = Object.freeze(
  TOOLS.map((t) => ({
    type: "function" as const,
    function: { name: t.name, description: t.description, parameters: t.parameters },
  })),
);

const TOOL_INDEX = new Map(TOOLS.map((t) => [t.name, t]));

export function getTool(name: string): Tool | undefined {
  return TOOL_INDEX.get(name);
}

export const TERMINAL_TOOL_NAMES = new Set(["task_complete"]);
