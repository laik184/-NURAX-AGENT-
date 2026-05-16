/**
 * server/tools/index.ts
 *
 * Main barrel export for the unified tool system.
 *
 * Import from here — never reach into sub-modules directly.
 *
 * Usage:
 *   import { unifiedRegistry, executeTool, ToolContext } from '../tools/index.ts';
 */

// ── Load catalog (registers all 38 tools into the registry) ──────────────────
import "./registry/tool-catalog.ts";

// ── Registry singleton ────────────────────────────────────────────────────────
export { unifiedRegistry } from "./registry/tool-registry.ts";

// ── Core execution ────────────────────────────────────────────────────────────
export { executeTool } from "./core/execute-tool.ts";

// ── Types ─────────────────────────────────────────────────────────────────────
export type {
  Tool,
  ToolContext,
  ToolResult,
  ToolDef,
  ToolCategory,
  ToolPermissions,
  PermissionLevel,
  RegisteredTool,
  ExecuteOptions,
  ToolMetrics,
  RegistryStats,
} from "./registry/tool-types.ts";

// ── Security ──────────────────────────────────────────────────────────────────
export { ALLOWED_COMMANDS, validateSandboxPath, validateCommand, getAuditLog } from "./registry/tool-security.ts";

// ── Events ────────────────────────────────────────────────────────────────────
export { emitToolStart, emitToolSuccess, emitToolError, emitToolOutput } from "./registry/tool-events.ts";

// ── Permissions ───────────────────────────────────────────────────────────────
export { checkPermissions, CATEGORY_PERMISSIONS } from "./registry/tool-permissions.ts";

// ── Result helpers ────────────────────────────────────────────────────────────
export { ok, fail, fromError, truncateResult } from "./core/tool-result.ts";

// ── Context helpers ───────────────────────────────────────────────────────────
export { createContext } from "./core/tool-context.ts";
