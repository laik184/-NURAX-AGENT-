/**
 * server/tools/core/tool-permissions.ts
 *
 * Runtime permission enforcement for tool execution.
 * Called by execute-tool.ts before dispatching to the tool's run() method.
 */

import {
  checkPermissions,
  permissionsForCategory,
} from "../registry/tool-permissions.ts";
import type { ToolCategory } from "../registry/tool-types.ts";

// ── Result ────────────────────────────────────────────────────────────────────

export interface PermissionGateResult {
  allowed: boolean;
  reason?: string;
}

// ── Gate ──────────────────────────────────────────────────────────────────────

/**
 * Evaluate whether the caller is permitted to execute a tool in the given
 * category. Returns allowed=false with a human-readable reason if blocked.
 */
export function runPermissionGate(category: ToolCategory): PermissionGateResult {
  const check = checkPermissions(category);
  if (!check.granted) {
    return { allowed: false, reason: check.reason };
  }
  return { allowed: true };
}

/**
 * Return the permission profile for a category — useful for logging/audit.
 */
export function describePermissions(category: ToolCategory) {
  return permissionsForCategory(category);
}

/**
 * Check whether a tool category requires sandbox containment.
 */
export function requiresSandbox(category: ToolCategory): boolean {
  return permissionsForCategory(category).requiresSandbox;
}

/**
 * Check whether a tool category is allowed to spawn child processes.
 */
export function canSpawnProcess(category: ToolCategory): boolean {
  return permissionsForCategory(category).allowsProcessSpawn;
}

/**
 * Check whether a tool category is allowed to make network requests.
 */
export function canAccessNetwork(category: ToolCategory): boolean {
  return permissionsForCategory(category).allowsNetworkAccess;
}
