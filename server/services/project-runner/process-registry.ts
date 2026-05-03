import type { ChildProcess } from "node:child_process";
import { MAX_LINE_BUFFER, type ProjectProcess } from "./types.ts";

export interface ProcessEntry {
  handle: ChildProcess;
  meta: ProjectProcess;
}

const processes = new Map<number, ProcessEntry>();

export function getEntry(projectId: number): ProcessEntry | undefined {
  return processes.get(projectId);
}

export function setEntry(projectId: number, entry: ProcessEntry): void {
  processes.set(projectId, entry);
}

export function removeEntry(projectId: number): void {
  processes.delete(projectId);
}

export function listEntries(): ProcessEntry[] {
  return Array.from(processes.values());
}

export function pushLine(meta: ProjectProcess, line: string): void {
  meta.lastLines.push(line);
  if (meta.lastLines.length > MAX_LINE_BUFFER) {
    meta.lastLines.splice(0, meta.lastLines.length - MAX_LINE_BUFFER);
  }
}
