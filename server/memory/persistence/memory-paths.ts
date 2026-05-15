/**
 * memory-paths.ts
 *
 * Path constants for the .nura/ memory directory inside each project sandbox.
 *
 * Layout:
 *   .data/sandboxes/:projectId/.nura/
 *     context.md          — human-readable project narrative (updated each run)
 *     run-history.jsonl   — one JSON line per completed run
 *     failures.json       — rolling last-10 failure entries
 *
 * Ownership: memory/persistence — pure path helpers, no I/O.
 */

import path from "path";
import { getProjectDir } from "../../infrastructure/sandbox/sandbox.util.ts";

export const NURA_DIR_NAME = ".nura";

export function getMemoryDir(projectId: number): string {
  return path.join(getProjectDir(projectId), NURA_DIR_NAME);
}

export function getContextPath(projectId: number): string {
  return path.join(getMemoryDir(projectId), "context.md");
}

export function getRunHistoryPath(projectId: number): string {
  return path.join(getMemoryDir(projectId), "run-history.jsonl");
}

export function getFailuresPath(projectId: number): string {
  return path.join(getMemoryDir(projectId), "failures.json");
}
