/**
 * process-persistence.ts
 *
 * Atomic JSON snapshot for runtime process state.
 *
 * File: .runtime/state.json (project root)
 *
 * Write strategy:
 *   Write to a temp file first, then atomically rename so a crash
 *   during write never leaves a corrupt state file.
 *
 * Read strategy:
 *   On parse failure (corrupt file) → return empty array and log a warning.
 *   Never throw — persistence failures must not crash the server.
 */

import fs from "node:fs/promises";
import path from "node:path";
import type { PersistedEntry } from "./process-types.ts";

// ─── Paths ────────────────────────────────────────────────────────────────────

const STATE_DIR = path.resolve(".runtime");
const STATE_FILE = path.join(STATE_DIR, "state.json");
const STATE_TMP = path.join(STATE_DIR, "state.json.tmp");

// ─── Serialisation helpers ────────────────────────────────────────────────────

interface StateFile {
  version: 1;
  savedAt: number;
  entries: PersistedEntry[];
}

function toStateFile(entries: PersistedEntry[]): StateFile {
  return { version: 1, savedAt: Date.now(), entries };
}

function parseStateFile(raw: string): PersistedEntry[] {
  const data = JSON.parse(raw) as StateFile;
  if (data.version !== 1 || !Array.isArray(data.entries)) return [];
  return data.entries;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Read persisted entries. Returns [] on any error (missing file, parse failure). */
export async function loadPersistedEntries(): Promise<PersistedEntry[]> {
  try {
    const raw = await fs.readFile(STATE_FILE, "utf8");
    const entries = parseStateFile(raw);
    console.log(`[process-persistence] Loaded ${entries.length} persisted entries`);
    return entries;
  } catch (err: any) {
    if (err.code !== "ENOENT") {
      // File exists but is unreadable/corrupt — warn but don't crash
      console.warn("[process-persistence] Could not read state file:", err.message);
    }
    return [];
  }
}

/** Atomically write the current entries to disk. Silently swallows errors. */
export async function saveEntries(entries: PersistedEntry[]): Promise<void> {
  try {
    await fs.mkdir(STATE_DIR, { recursive: true });
    const payload = JSON.stringify(toStateFile(entries), null, 2);
    await fs.writeFile(STATE_TMP, payload, "utf8");
    await fs.rename(STATE_TMP, STATE_FILE);
  } catch (err: any) {
    console.warn("[process-persistence] Could not save state:", err.message);
  }
}

/** Delete the state file (call after clean shutdown with no running processes). */
export async function clearPersistedState(): Promise<void> {
  try {
    await fs.unlink(STATE_FILE);
  } catch {
    // File may not exist — that's fine
  }
}

/** Convert a ProcessEntry (with ChildProcess) to a PersistedEntry (without it). */
export function toPersistedEntry(e: {
  projectId: number;
  pid: number;
  port: number;
  status: import("./process-types.ts").ProcessStatus;
  startedAt: number;
  command: string;
  cwd: string;
  restartCount: number;
  lastHeartbeat: number;
}): PersistedEntry {
  return {
    projectId: e.projectId,
    pid: e.pid,
    port: e.port,
    status: e.status,
    startedAt: e.startedAt,
    command: e.command,
    cwd: e.cwd,
    restartCount: e.restartCount,
    lastHeartbeat: e.lastHeartbeat,
  };
}
