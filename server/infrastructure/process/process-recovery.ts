/**
 * process-recovery.ts
 *
 * Startup reconciliation — runs once on server boot.
 *
 * Flow:
 *   1. Load persisted entries (from process-persistence).
 *   2. For each entry: check PID liveness via kill(pid, 0).
 *   3. Since child processes use detached: false, they die when
 *      the Node server exits. All PIDs will be dead after a restart.
 *   4. Dead entries → status "stopped" (clean state for UI).
 *   5. Return reconciliation summary for logging.
 *
 * Why this is still valuable:
 *   - Provides clean audit trail: "project 42 was running, now stopped"
 *   - Enables future auto-restart (entries carry cwd + command)
 *   - Health monitor uses isPidAlive() to catch mid-session crashes
 */

import type { PersistedEntry } from "./process-types.ts";

// ─── PID liveness check ───────────────────────────────────────────────────────

/**
 * Check whether a process with the given PID is still alive.
 * Uses signal 0 — sends no signal, just checks existence.
 * Returns false for any error (access denied, no such process, etc.).
 */
export function isPidAlive(pid: number): boolean {
  if (!pid || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

// ─── Reconciliation ───────────────────────────────────────────────────────────

export interface ReconciliationResult {
  total: number;
  alive: number;
  dead: number;
  cleaned: PersistedEntry[];
}

/**
 * Reconcile persisted entries against live OS state.
 *
 * Returns cleaned entries (dead ones marked "stopped") for the registry
 * to load as its initial in-memory snapshot — no ChildProcess reference,
 * since those processes no longer exist.
 */
export function reconcileOnStartup(persisted: PersistedEntry[]): ReconciliationResult {
  let alive = 0;
  let dead = 0;
  const cleaned: PersistedEntry[] = [];

  for (const entry of persisted) {
    if (isPidAlive(entry.pid)) {
      // Process survived (unusual with detached: false — record it)
      alive++;
      cleaned.push({ ...entry, status: "running", lastHeartbeat: Date.now() });
    } else {
      // Process is dead — mark stopped, preserve history
      dead++;
      cleaned.push({ ...entry, status: "stopped" });
    }
  }

  if (persisted.length > 0) {
    console.log(
      `[process-recovery] Reconciliation: ${persisted.length} persisted, ` +
      `${alive} alive, ${dead} stopped`
    );
    for (const e of cleaned) {
      const ageMs = Date.now() - e.startedAt;
      const ageMin = Math.round(ageMs / 60_000);
      console.log(
        `  project ${e.projectId}: pid=${e.pid} port=${e.port} ` +
        `status=${e.status} age=${ageMin}m cmd="${e.command}"`
      );
    }
  }

  return { total: persisted.length, alive, dead, cleaned };
}
