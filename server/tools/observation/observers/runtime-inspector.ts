/**
 * server/tools/observation/observers/runtime-inspector.ts
 *
 * Reads runtimeManager state and provides a lightweight health snapshot.
 * Used by the observation builder for server/preview/deploy tool results.
 *
 * Single responsibility: runtimeManager → RuntimeHealth snapshot.
 */

import { runtimeManager } from "../../../infrastructure/runtime/runtime-manager.ts";
import type { RuntimeHealth } from "../types.ts";

// ── Tools that warrant a runtime health check ─────────────────────────────────

const SERVER_TOOLS = new Set([
  "server_start", "server_stop", "server_restart",
  "shell_exec", "deploy_build", "package_install",
]);

/**
 * Capture current runtime health for a project.
 * Returns null if the tool does not interact with the runtime.
 */
export function inspectRuntime(projectId: number, toolName: string): RuntimeHealth | null {
  if (!SERVER_TOOLS.has(toolName)) return null;

  const entry = runtimeManager.get(projectId);
  if (!entry) {
    return { running: false, port: null, uptimeMs: null, status: "stopped" };
  }

  return {
    running:  entry.status === "running",
    port:     entry.port ?? null,
    uptimeMs: entry.uptimeMs ?? null,
    status:   entry.status,
  };
}

/**
 * Quick check: is the project server currently running?
 */
export function isServerRunning(projectId: number): boolean {
  const entry = runtimeManager.get(projectId);
  return entry?.status === "running";
}

/**
 * Format a RuntimeHealth snapshot for LLM context injection.
 */
export function formatRuntimeHealth(health: RuntimeHealth): string {
  if (!health.running) {
    return `Runtime: NOT running (status: ${health.status})`;
  }
  const uptime = health.uptimeMs != null
    ? `uptime: ${(health.uptimeMs / 1000).toFixed(1)}s`
    : "";
  return `Runtime: running on port ${health.port}${uptime ? ` (${uptime})` : ""}`;
}
