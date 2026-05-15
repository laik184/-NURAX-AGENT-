/**
 * memory-store.ts
 *
 * All file I/O for the .nura/ project memory directory.
 *
 * Responsibilities:
 *   - ensureMemoryDir()       — create .nura/ if absent
 *   - readContextMd()         — read project narrative
 *   - writeContextMd()        — write/overwrite project narrative
 *   - appendRunSummary()      — append one line to run-history.jsonl
 *   - readRecentRuns()        — read last N runs from run-history.jsonl
 *   - readFailures()          — read failures.json
 *   - appendFailure()         — prepend+truncate failures.json (rolling 10)
 *
 * Ownership: memory/persistence — I/O only, no logic.
 */

import fs   from "fs/promises";
import path from "path";
import {
  getMemoryDir,
  getContextPath,
  getRunHistoryPath,
  getFailuresPath,
} from "./memory-paths.ts";
import type { RunSummary, FailureEntry } from "../types.ts";

const MAX_FAILURES = 10;

// ─── Directory ────────────────────────────────────────────────────────────────

export async function ensureMemoryDir(projectId: number): Promise<void> {
  await fs.mkdir(getMemoryDir(projectId), { recursive: true });
}

// ─── context.md ──────────────────────────────────────────────────────────────

export async function readContextMd(projectId: number): Promise<string> {
  try {
    return await fs.readFile(getContextPath(projectId), "utf-8");
  } catch {
    return "";
  }
}

export async function writeContextMd(projectId: number, content: string): Promise<void> {
  await ensureMemoryDir(projectId);
  await fs.writeFile(getContextPath(projectId), content, "utf-8");
}

// ─── run-history.jsonl ────────────────────────────────────────────────────────

export async function appendRunSummary(
  projectId: number,
  summary:   RunSummary,
): Promise<void> {
  await ensureMemoryDir(projectId);
  const line = JSON.stringify(summary) + "\n";
  await fs.appendFile(getRunHistoryPath(projectId), line, "utf-8");
}

export async function readRecentRuns(
  projectId: number,
  limit = 5,
): Promise<RunSummary[]> {
  try {
    const raw   = await fs.readFile(getRunHistoryPath(projectId), "utf-8");
    const lines = raw.trim().split("\n").filter(Boolean);
    return lines
      .slice(-limit)
      .map(l => JSON.parse(l) as RunSummary)
      .reverse(); // most recent first
  } catch {
    return [];
  }
}

// ─── failures.json ────────────────────────────────────────────────────────────

export async function readFailures(projectId: number): Promise<FailureEntry[]> {
  try {
    const raw = await fs.readFile(getFailuresPath(projectId), "utf-8");
    return JSON.parse(raw) as FailureEntry[];
  } catch {
    return [];
  }
}

export async function appendFailure(
  projectId: number,
  entry:     FailureEntry,
): Promise<void> {
  await ensureMemoryDir(projectId);
  const existing = await readFailures(projectId);
  const updated  = [entry, ...existing].slice(0, MAX_FAILURES);
  await fs.writeFile(
    getFailuresPath(projectId),
    JSON.stringify(updated, null, 2),
    "utf-8",
  );
}
