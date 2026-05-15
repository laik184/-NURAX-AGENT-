/**
 * memory-store.ts
 *
 * All file I/O for the .nura/ project memory directory.
 *
 * Responsibilities:
 *   - ensureMemoryDir()         — create .nura/ if absent
 *   - readContextMd/write       — project run log
 *   - readArchitectureMd/write  — architectural decisions narrative
 *   - appendRunSummary          — append one line to run-history.jsonl
 *   - readRecentRuns            — read last N runs from run-history.jsonl
 *   - readDecisions/append      — decisions.json (rolling last-20)
 *   - readFailures/append       — failures.json (rolling last-10)
 *
 * Ownership: memory/persistence — I/O only, no logic.
 */

import fs   from "fs/promises";
import {
  getMemoryDir,
  getContextPath,
  getArchitecturePath,
  getRunHistoryPath,
  getDecisionsPath,
  getFailuresPath,
} from "./memory-paths.ts";
import type { RunSummary, FailureEntry, ArchitectureDecision } from "../types.ts";

const MAX_FAILURES  = 10;
const MAX_DECISIONS = 20;

// ─── Directory ────────────────────────────────────────────────────────────────

export async function ensureMemoryDir(projectId: number): Promise<void> {
  await fs.mkdir(getMemoryDir(projectId), { recursive: true });
}

// ─── context.md ──────────────────────────────────────────────────────────────

export async function readContextMd(projectId: number): Promise<string> {
  try { return await fs.readFile(getContextPath(projectId), "utf-8"); }
  catch { return ""; }
}

export async function writeContextMd(projectId: number, content: string): Promise<void> {
  await ensureMemoryDir(projectId);
  await fs.writeFile(getContextPath(projectId), content, "utf-8");
}

// ─── architecture.md ─────────────────────────────────────────────────────────

export async function readArchitectureMd(projectId: number): Promise<string> {
  try { return await fs.readFile(getArchitecturePath(projectId), "utf-8"); }
  catch { return ""; }
}

export async function writeArchitectureMd(projectId: number, content: string): Promise<void> {
  await ensureMemoryDir(projectId);
  await fs.writeFile(getArchitecturePath(projectId), content, "utf-8");
}

// ─── run-history.jsonl ────────────────────────────────────────────────────────

export async function appendRunSummary(
  projectId: number,
  summary:   RunSummary,
): Promise<void> {
  await ensureMemoryDir(projectId);
  await fs.appendFile(getRunHistoryPath(projectId), JSON.stringify(summary) + "\n", "utf-8");
}

export async function readRecentRuns(
  projectId: number,
  limit = 5,
): Promise<RunSummary[]> {
  try {
    const raw   = await fs.readFile(getRunHistoryPath(projectId), "utf-8");
    const lines = raw.trim().split("\n").filter(Boolean);
    return lines.slice(-limit).map(l => JSON.parse(l) as RunSummary).reverse();
  } catch { return []; }
}

// ─── decisions.json ───────────────────────────────────────────────────────────

export async function readDecisions(projectId: number): Promise<ArchitectureDecision[]> {
  try {
    const raw = await fs.readFile(getDecisionsPath(projectId), "utf-8");
    return JSON.parse(raw) as ArchitectureDecision[];
  } catch { return []; }
}

export async function appendDecision(
  projectId: number,
  decision:  ArchitectureDecision,
): Promise<void> {
  await ensureMemoryDir(projectId);
  const existing = await readDecisions(projectId);
  const updated  = [decision, ...existing].slice(0, MAX_DECISIONS);
  await fs.writeFile(getDecisionsPath(projectId), JSON.stringify(updated, null, 2), "utf-8");
}

// ─── failures.json ────────────────────────────────────────────────────────────

export async function readFailures(projectId: number): Promise<FailureEntry[]> {
  try {
    const raw = await fs.readFile(getFailuresPath(projectId), "utf-8");
    return JSON.parse(raw) as FailureEntry[];
  } catch { return []; }
}

export async function appendFailure(
  projectId: number,
  entry:     FailureEntry,
): Promise<void> {
  await ensureMemoryDir(projectId);
  const existing = await readFailures(projectId);
  const updated  = [entry, ...existing].slice(0, MAX_FAILURES);
  await fs.writeFile(getFailuresPath(projectId), JSON.stringify(updated, null, 2), "utf-8");
}
