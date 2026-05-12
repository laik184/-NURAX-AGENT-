/**
 * IQ 2000 — Console · History Service
 *
 * Reads persisted console logs from the `console_logs` table.
 * Supports pagination, kind-filtering, and time-bounded queries.
 */

import { db } from '../../infrastructure/db/index.ts';
import { consoleLogs } from '../../../shared/schema.ts';
import { eq, and, gte, inArray, desc } from 'drizzle-orm';
import type { ConsoleLine, HistoryQuery, HistoryResult, LineKind } from '../types.ts';

class HistoryService {
  async query(opts: HistoryQuery): Promise<HistoryResult> {
    const {
      projectId,
      limit = 200,
      offset = 0,
      kinds,
      since,
    } = opts;

    try {
      const conditions = [eq(consoleLogs.projectId, projectId)];

      if (kinds && kinds.length > 0) {
        conditions.push(inArray(consoleLogs.stream, kinds as string[]));
      }

      if (since) {
        conditions.push(gte(consoleLogs.ts, since));
      }

      const rows = await db
        .select()
        .from(consoleLogs)
        .where(and(...conditions))
        .orderBy(desc(consoleLogs.ts))
        .limit(limit)
        .offset(offset);

      const lines: ConsoleLine[] = rows.map((row) => ({
        id: String(row.id),
        projectId: row.projectId ?? projectId,
        kind: (row.stream ?? 'stdout') as LineKind,
        text: row.line ?? '',
        ts: row.ts ?? new Date(),
      }));

      return { ok: true, lines: lines.reverse(), total: lines.length };
    } catch (err) {
      return { ok: false, lines: [], total: 0, error: (err as Error).message };
    }
  }

  async clearProject(projectId: number): Promise<{ ok: boolean; error?: string }> {
    try {
      await db.delete(consoleLogs).where(eq(consoleLogs.projectId, projectId));
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }
}

export const historyService = new HistoryService();
