/**
 * IQ 2000 — Console · Persist Service
 *
 * Writes ConsoleLine objects to the `console_logs` PostgreSQL table
 * via Drizzle ORM.  Batches writes in a 500 ms sliding window to
 * reduce per-row round-trip overhead.
 */

import { db } from '../../infrastructure/db/index.ts';
import { consoleLogs } from '../../../shared/schema.ts';
import type { ConsoleLine, PersistOptions, PersistResult } from '../types.ts';

const BATCH_INTERVAL_MS = 500;
const MAX_BATCH_SIZE = 200;

class PersistService {
  private queue: PersistOptions[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;

  // ─── Public API ────────────────────────────────────────────────────────

  /**
   * Enqueue a ConsoleLine for batch persistence.
   * Flushes immediately when batch reaches MAX_BATCH_SIZE.
   */
  enqueue(line: ConsoleLine): void {
    this.queue.push({ projectId: line.projectId, kind: line.kind, text: line.text });

    if (this.queue.length >= MAX_BATCH_SIZE) {
      this.flush();
      return;
    }

    if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), BATCH_INTERVAL_MS);
    }
  }

  /**
   * Persist a single line immediately (bypass batching).
   * Used for high-priority system/error lines.
   */
  async persistNow(line: ConsoleLine): Promise<PersistResult> {
    try {
      const rows = await db
        .insert(consoleLogs)
        .values({ projectId: line.projectId, stream: line.kind, line: line.text })
        .returning({ id: consoleLogs.id });
      return { ok: true, id: rows[0]?.id };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }

  // ─── Batch flush ───────────────────────────────────────────────────────

  private async flush(): Promise<void> {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }

    const batch = this.queue.splice(0, this.queue.length);
    if (batch.length === 0) return;

    try {
      await db.insert(consoleLogs).values(
        batch.map((item) => ({
          projectId: item.projectId,
          stream: item.kind,
          line: item.text,
        })),
      );
    } catch (err) {
      console.error('[IQ2000][console:persist] Batch flush error:', (err as Error).message);
    }
  }

  dispose(): void {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    this.flush().catch(() => {});
  }
}

export const persistService = new PersistService();
