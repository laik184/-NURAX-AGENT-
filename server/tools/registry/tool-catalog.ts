/**
 * server/tools/registry/tool-catalog.ts
 *
 * Populates the unified registry with all 38 tools.
 * This is the ONLY place where tools are registered.
 *
 * Import order matters for readability — not for execution.
 * The registry is populated once at module load time.
 */

import { unifiedRegistry } from "./tool-registry.ts";
import { CATEGORY_PERMISSIONS } from "./tool-permissions.ts";
import type { RegisteredTool } from "./tool-types.ts";

// ── Category imports ──────────────────────────────────────────────────────────

import { fileList, fileRead, fileWrite, fileDelete }                             from "../../agents/tools/categories/file-tools.ts";
import { fileSearch, fileReplace }                                                from "../../agents/tools/categories/file-search-tools.ts";
import { shellExec }                                                              from "../../agents/tools/categories/shell-tools.ts";
import { packageInstall, packageUninstall, packageAudit, detectMissingPackages } from "../../agents/tools/categories/package-tools.ts";
import { serverStart, serverStop, serverRestart, serverLogs }                    from "../../agents/tools/categories/server-lifecycle-tools.ts";
import { previewUrl, previewScreenshot }                                          from "../../agents/tools/categories/preview-tools.ts";
import { envRead, envWrite }                                                      from "../../agents/tools/categories/env-tools.ts";
import { gitStatus, gitAdd, gitCommit, gitClone, gitPush, gitPull }              from "../../agents/tools/categories/git-tools.ts";
import { dbPush, dbMigrate }                                                      from "../../agents/tools/categories/db-tools.ts";
import { deployPublish }                                                          from "../../agents/tools/categories/deploy-tools.ts";
import { testRun, debugRun, monitorCheck }                                        from "../../agents/tools/categories/testing-tools.ts";
import { browserEval }                                                            from "../../agents/tools/categories/browser-tools.ts";
import { apiCall, searchWeb }                                                     from "../../agents/tools/categories/network-tools.ts";
import { authLogin }                                                              from "../../agents/tools/categories/auth-tools.ts";
import { taskComplete, agentMessage, agentQuestion }                              from "../../agents/tools/categories/agent-control-tools.ts";

// ── Catalog definition ────────────────────────────────────────────────────────

const CATALOG: RegisteredTool[] = [
  // ── FILE (6) ───────────────────────────────────────────────────────────────
  { tool: fileList,               category: "file",          terminal: false, defaultTimeoutMs: 10_000,  permissions: CATEGORY_PERMISSIONS["file"] },
  { tool: fileRead,               category: "file",          terminal: false, defaultTimeoutMs: 10_000,  permissions: CATEGORY_PERMISSIONS["file"] },
  { tool: fileWrite,              category: "file",          terminal: false, defaultTimeoutMs: 10_000,  permissions: CATEGORY_PERMISSIONS["file"] },
  { tool: fileDelete,             category: "file",          terminal: false, defaultTimeoutMs: 10_000,  permissions: CATEGORY_PERMISSIONS["file"] },
  { tool: fileSearch,             category: "file",          terminal: false, defaultTimeoutMs: 15_000,  permissions: CATEGORY_PERMISSIONS["file"] },
  { tool: fileReplace,            category: "file",          terminal: false, defaultTimeoutMs: 10_000,  permissions: CATEGORY_PERMISSIONS["file"] },

  // ── SHELL (1) ──────────────────────────────────────────────────────────────
  { tool: shellExec,              category: "shell",         terminal: false, defaultTimeoutMs: 30_000,  permissions: CATEGORY_PERMISSIONS["shell"] },

  // ── PACKAGE (4) ────────────────────────────────────────────────────────────
  { tool: packageInstall,         category: "package",       terminal: false, defaultTimeoutMs: 120_000, permissions: CATEGORY_PERMISSIONS["package"] },
  { tool: packageUninstall,       category: "package",       terminal: false, defaultTimeoutMs: 60_000,  permissions: CATEGORY_PERMISSIONS["package"] },
  { tool: packageAudit,           category: "package",       terminal: false, defaultTimeoutMs: 30_000,  permissions: CATEGORY_PERMISSIONS["package"] },
  { tool: detectMissingPackages,  category: "package",       terminal: false, defaultTimeoutMs: 10_000,  permissions: CATEGORY_PERMISSIONS["package"] },

  // ── SERVER LIFECYCLE (4) ───────────────────────────────────────────────────
  { tool: serverStart,            category: "server",        terminal: false, defaultTimeoutMs: 15_000,  permissions: CATEGORY_PERMISSIONS["server"] },
  { tool: serverStop,             category: "server",        terminal: false, defaultTimeoutMs: 10_000,  permissions: CATEGORY_PERMISSIONS["server"] },
  { tool: serverRestart,          category: "server",        terminal: false, defaultTimeoutMs: 15_000,  permissions: CATEGORY_PERMISSIONS["server"] },
  { tool: serverLogs,             category: "server",        terminal: false, defaultTimeoutMs: 5_000,   permissions: CATEGORY_PERMISSIONS["server"] },

  // ── PREVIEW (2) ────────────────────────────────────────────────────────────
  { tool: previewUrl,             category: "preview",       terminal: false, defaultTimeoutMs: 5_000,   permissions: CATEGORY_PERMISSIONS["preview"] },
  { tool: previewScreenshot,      category: "preview",       terminal: false, defaultTimeoutMs: 20_000,  permissions: CATEGORY_PERMISSIONS["preview"] },

  // ── ENV (2) ────────────────────────────────────────────────────────────────
  { tool: envRead,                category: "env",           terminal: false, defaultTimeoutMs: 5_000,   permissions: CATEGORY_PERMISSIONS["env"] },
  { tool: envWrite,               category: "env",           terminal: false, defaultTimeoutMs: 5_000,   permissions: CATEGORY_PERMISSIONS["env"] },

  // ── GIT (6) ────────────────────────────────────────────────────────────────
  { tool: gitStatus,              category: "git",           terminal: false, defaultTimeoutMs: 10_000,  permissions: CATEGORY_PERMISSIONS["git"] },
  { tool: gitAdd,                 category: "git",           terminal: false, defaultTimeoutMs: 10_000,  permissions: CATEGORY_PERMISSIONS["git"] },
  { tool: gitCommit,              category: "git",           terminal: false, defaultTimeoutMs: 10_000,  permissions: CATEGORY_PERMISSIONS["git"] },
  { tool: gitClone,               category: "git",           terminal: false, defaultTimeoutMs: 60_000,  permissions: CATEGORY_PERMISSIONS["git"] },
  { tool: gitPush,                category: "git",           terminal: false, defaultTimeoutMs: 30_000,  permissions: CATEGORY_PERMISSIONS["git"] },
  { tool: gitPull,                category: "git",           terminal: false, defaultTimeoutMs: 30_000,  permissions: CATEGORY_PERMISSIONS["git"] },

  // ── DATABASE (2) ───────────────────────────────────────────────────────────
  { tool: dbPush,                 category: "db",            terminal: false, defaultTimeoutMs: 60_000,  permissions: CATEGORY_PERMISSIONS["db"] },
  { tool: dbMigrate,              category: "db",            terminal: false, defaultTimeoutMs: 60_000,  permissions: CATEGORY_PERMISSIONS["db"] },

  // ── DEPLOY (1) ─────────────────────────────────────────────────────────────
  { tool: deployPublish,          category: "deploy",        terminal: false, defaultTimeoutMs: 120_000, permissions: CATEGORY_PERMISSIONS["deploy"] },

  // ── TESTING / DEBUG (3) ────────────────────────────────────────────────────
  { tool: testRun,                category: "testing",       terminal: false, defaultTimeoutMs: 60_000,  permissions: CATEGORY_PERMISSIONS["testing"] },
  { tool: debugRun,               category: "testing",       terminal: false, defaultTimeoutMs: 30_000,  permissions: CATEGORY_PERMISSIONS["testing"] },
  { tool: monitorCheck,           category: "testing",       terminal: false, defaultTimeoutMs: 10_000,  permissions: CATEGORY_PERMISSIONS["testing"] },

  // ── BROWSER (1) ────────────────────────────────────────────────────────────
  { tool: browserEval,            category: "browser",       terminal: false, defaultTimeoutMs: 20_000,  permissions: CATEGORY_PERMISSIONS["browser"] },

  // ── NETWORK (2) ────────────────────────────────────────────────────────────
  { tool: apiCall,                category: "network",       terminal: false, defaultTimeoutMs: 15_000,  permissions: CATEGORY_PERMISSIONS["network"] },
  { tool: searchWeb,              category: "network",       terminal: false, defaultTimeoutMs: 10_000,  permissions: CATEGORY_PERMISSIONS["network"] },

  // ── AUTH (1) ───────────────────────────────────────────────────────────────
  { tool: authLogin,              category: "auth",          terminal: false, defaultTimeoutMs: 10_000,  permissions: CATEGORY_PERMISSIONS["auth"] },

  // ── AGENT CONTROL (3) ──────────────────────────────────────────────────────
  { tool: taskComplete,           category: "agent-control", terminal: true,  defaultTimeoutMs: 5_000,   permissions: CATEGORY_PERMISSIONS["agent-control"] },
  { tool: agentMessage,           category: "agent-control", terminal: false, defaultTimeoutMs: 5_000,   permissions: CATEGORY_PERMISSIONS["agent-control"] },
  { tool: agentQuestion,          category: "agent-control", terminal: false, defaultTimeoutMs: 5_000,   permissions: CATEGORY_PERMISSIONS["agent-control"] },
];

// ── Populate registry ─────────────────────────────────────────────────────────

unifiedRegistry.registerAll(CATALOG);

console.log(`[tool-registry] Loaded ${unifiedRegistry.totalCount} tools across ${Object.keys(CATEGORY_PERMISSIONS).length} categories`);

export { CATALOG };
