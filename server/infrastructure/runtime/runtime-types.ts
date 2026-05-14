/**
 * runtime-types.ts
 *
 * Unified public types for the runtime orchestration layer.
 *
 * Consumers (routes, tools, preview, service) import from here.
 * The process/ layer types are internal implementation details.
 */

// ─── Status ───────────────────────────────────────────────────────────────────

export type RuntimeStatus = "starting" | "running" | "stopped" | "crashed";

// ─── Start / stop / restart options ──────────────────────────────────────────

export interface RuntimeStartOptions {
  /** Shell command to run (default: "npm run dev"). */
  command?: string;
  /** Extra environment variables passed to the child process. */
  env?: Record<string, string>;
}

// ─── Results ──────────────────────────────────────────────────────────────────

export interface RuntimeStartResult {
  ok: boolean;
  port?: number;
  pid?: number;
  error?: string;
  alreadyRunning?: boolean;
}

export interface RuntimeStopResult {
  ok: boolean;
  error?: string;
}

export interface RuntimeRestartResult {
  ok: boolean;
  port?: number;
  pid?: number;
  error?: string;
}

// ─── Entry (read view) ────────────────────────────────────────────────────────

export interface RuntimeEntry {
  projectId: number;
  pid: number;
  port: number;
  status: RuntimeStatus;
  startedAt: number;
  command: string;
  cwd: string;
  restartCount: number;
  lastHeartbeat: number;
  uptimeMs: number;
}
