import type { Tool, ToolDef, ToolContext } from "./types.ts";

import { fileList, fileRead, fileWrite, fileDelete } from "./categories/file-tools.ts";
import { fileSearch, fileReplace } from "./categories/file-search-tools.ts";
import { shellExec } from "./categories/shell-tools.ts";
import { packageInstall, packageUninstall, packageAudit, detectMissingPackages } from "./categories/package-tools.ts";
import { serverStart, serverStop, serverRestart, serverLogs } from "./categories/server-lifecycle-tools.ts";
import { previewUrl, previewScreenshot } from "./categories/preview-tools.ts";
import { envRead, envWrite } from "./categories/env-tools.ts";
import { gitStatus, gitAdd, gitCommit, gitClone, gitPush, gitPull } from "./categories/git-tools.ts";
import { dbPush, dbMigrate } from "./categories/db-tools.ts";
import { deployPublish } from "./categories/deploy-tools.ts";
import { testRun, debugRun, monitorCheck } from "./categories/testing-tools.ts";
import { browserEval } from "./categories/browser-tools.ts";
import { apiCall, searchWeb } from "./categories/network-tools.ts";
import { authLogin } from "./categories/auth-tools.ts";
import { taskComplete, agentMessage, agentQuestion } from "./categories/agent-control-tools.ts";

export type { ToolContext };

export const TOOLS: Tool[] = [
  // File operations
  fileList,
  fileRead,
  fileWrite,
  fileDelete,
  fileSearch,
  fileReplace,

  // Shell
  shellExec,

  // Package management
  packageInstall,
  packageUninstall,
  packageAudit,
  detectMissingPackages,

  // Server lifecycle
  serverStart,
  serverStop,
  serverRestart,
  serverLogs,

  // Preview
  previewUrl,
  previewScreenshot,

  // Environment
  envRead,
  envWrite,

  // Git
  gitStatus,
  gitAdd,
  gitCommit,
  gitClone,
  gitPush,
  gitPull,

  // Database
  dbPush,
  dbMigrate,

  // Deploy
  deployPublish,

  // Testing & Debug
  testRun,
  debugRun,
  monitorCheck,

  // Browser
  browserEval,

  // Network
  apiCall,
  searchWeb,

  // Auth
  authLogin,

  // Agent control (MUST be last)
  taskComplete,
  agentMessage,
  agentQuestion,
];

export const TERMINAL_TOOL_NAMES = new Set<string>(["task_complete"]);

export const TOOL_DEFS: ToolDef[] = TOOLS.map((t) => ({
  type: "function",
  function: {
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  },
}));

const TOOL_MAP = new Map<string, Tool>(TOOLS.map((t) => [t.name, t]));

export function getTool(name: string): Tool | undefined {
  return TOOL_MAP.get(name);
}
