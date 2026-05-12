/**
 * IQ 2000 — Console · History Controller
 *
 * Handles REST requests for reading and clearing persisted console logs.
 */

import type { Request, Response } from 'express';
import { historyService } from './history.service.ts';
import type { LineKind } from '../types.ts';

export const historyController = {
  /**
   * GET /api/console/history?projectId=<n>&limit=<n>&offset=<n>&kinds=stdout,stderr
   *
   * Returns paginated console log history for a project.
   */
  async getHistory(req: Request, res: Response): Promise<void> {
    const projectId = Number(req.query['projectId']);

    if (!projectId || isNaN(projectId)) {
      res.status(400).json({ ok: false, error: 'projectId query param is required' });
      return;
    }

    const limit  = Math.min(Number(req.query['limit']  ?? 200), 1000);
    const offset = Number(req.query['offset'] ?? 0);
    const kindsRaw = req.query['kinds'] as string | undefined;
    const kinds = kindsRaw
      ? (kindsRaw.split(',').map((k) => k.trim()) as LineKind[])
      : undefined;

    const sinceRaw = req.query['since'] as string | undefined;
    const since = sinceRaw ? new Date(sinceRaw) : undefined;

    const result = await historyService.query({ projectId, limit, offset, kinds, since });
    res.status(result.ok ? 200 : 500).json(result);
  },

  /**
   * DELETE /api/console/history?projectId=<n>
   *
   * Clears all persisted logs for a project.
   */
  async clearHistory(req: Request, res: Response): Promise<void> {
    const projectId = Number(req.query['projectId']);

    if (!projectId || isNaN(projectId)) {
      res.status(400).json({ ok: false, error: 'projectId query param is required' });
      return;
    }

    const result = await historyService.clearProject(projectId);
    res.status(result.ok ? 200 : 500).json(result);
  },
};
