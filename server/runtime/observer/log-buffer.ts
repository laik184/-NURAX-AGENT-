/**
 * log-buffer.ts
 *
 * Per-project rolling log buffer.
 *
 * Subscribes to bus "console.log" events and maintains a fixed-size
 * ring buffer of recent log lines per project. Provides a snapshot API
 * used by the startup verifier and log analyzer.
 *
 * Ownership: runtime/observer — single responsibility: store recent logs.
 * No LLM calls, no side effects beyond memory.
 */

import { bus, type ConsoleLogEvent } from "../../infrastructure/events/bus.ts";

// ─── Config ───────────────────────────────────────────────────────────────────

const MAX_LINES_PER_PROJECT = 300;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BufferedLine {
  stream: "stdout" | "stderr";
  text: string;
  ts: number;
}

// ─── Buffer store ─────────────────────────────────────────────────────────────

class LogBuffer {
  private readonly buffers = new Map<number, BufferedLine[]>();
  private unsubscribe: (() => void) | null = null;

  start(): void {
    if (this.unsubscribe) return;
    this.unsubscribe = bus.subscribe("console.log", (ev: ConsoleLogEvent) => {
      this.append(ev.projectId, ev.stream, ev.line);
    });
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  /** Append a line to the project buffer (ring-buffer eviction). */
  append(projectId: number, stream: "stdout" | "stderr", text: string): void {
    let buf = this.buffers.get(projectId);
    if (!buf) {
      buf = [];
      this.buffers.set(projectId, buf);
    }
    buf.push({ stream, text, ts: Date.now() });
    if (buf.length > MAX_LINES_PER_PROJECT) buf.shift();
  }

  /** Snapshot the last N lines for a project. */
  tail(projectId: number, n = 80): BufferedLine[] {
    return (this.buffers.get(projectId) ?? []).slice(-n);
  }

  /** Lines captured after a given timestamp. */
  since(projectId: number, afterTs: number): BufferedLine[] {
    return (this.buffers.get(projectId) ?? []).filter(l => l.ts > afterTs);
  }

  /** Clear buffer for a project (e.g. on restart). */
  clear(projectId: number): void {
    this.buffers.delete(projectId);
  }
}

export const logBuffer = new LogBuffer();
