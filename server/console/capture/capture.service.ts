/**
 * IQ 2000 — Console · Capture Service
 *
 * Attaches to Node.js child-process stdout/stderr streams and fans
 * each chunk through the filter service.  The orchestrator wires
 * the resulting ConsoleLine objects to persist + stream.
 */

import type { AttachOptions, CaptureSnapshot, ConsoleLine } from '../types.ts';
import { filterService } from '../filter/filter.service.ts';

type LineHandler = (line: ConsoleLine) => void;

interface AttachedProcess {
  processId: string;
  projectId: number;
  capturedTotal: number;
}

class CaptureService {
  private attached = new Map<string, AttachedProcess>();
  private handlers = new Set<LineHandler>();

  // ─── Public API ────────────────────────────────────────────────────────

  /**
   * Subscribe to all captured lines.
   * Returns an unsubscribe function.
   */
  onLine(handler: LineHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  /**
   * Attach to a running child process's stdio streams.
   * Safe to call multiple times — duplicate processId is a no-op.
   */
  attach(options: AttachOptions): void {
    const { processId, projectId, stdout, stderr } = options;

    if (this.attached.has(processId)) return;

    const record: AttachedProcess = { processId, projectId, capturedTotal: 0 };
    this.attached.set(processId, record);

    const handleChunk = (stream: 'stdout' | 'stderr') => (chunk: Buffer | string) => {
      const lines = filterService.processChunk(projectId, chunk, stream);
      for (const line of lines) {
        record.capturedTotal++;
        this.emit(line);
      }
    };

    stdout.on('data', handleChunk('stdout'));
    stderr.on('data', handleChunk('stderr'));

    stdout.once('end', () => this.emitSystem(projectId, `[IQ2000] Process ${processId} stdout closed.`));
    stderr.once('end', () => {});
  }

  /**
   * Detach tracking for a process (streams close naturally when the
   * child exits; we just clean up our bookkeeping).
   */
  detach(processId: string): void {
    this.attached.delete(processId);
  }

  /**
   * Inject a synthetic system message (e.g. "Project started") as a
   * ConsoleLine so it flows through the full persist → stream pipeline.
   */
  injectSystem(projectId: number, text: string): void {
    this.emitSystem(projectId, text);
  }

  getSnapshot(): CaptureSnapshot {
    return {
      attached: [...this.attached.keys()],
      totalCaptured: [...this.attached.values()].reduce((s, p) => s + p.capturedTotal, 0),
    };
  }

  // ─── Internal ──────────────────────────────────────────────────────────

  private emitSystem(projectId: number, text: string): void {
    const line: ConsoleLine = {
      id: `sys-${Date.now()}`,
      projectId,
      kind: 'system',
      text,
      ts: new Date(),
    };
    this.emit(line);
  }

  private emit(line: ConsoleLine): void {
    for (const handler of this.handlers) {
      try { handler(line); } catch {}
    }
  }
}

export const captureService = new CaptureService();
