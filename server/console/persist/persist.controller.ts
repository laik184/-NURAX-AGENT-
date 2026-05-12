/**
 * IQ 2000 — Console · Persist Controller
 *
 * Exposes REST endpoints for manual log injection and flush status.
 * The normal path (capture → persist) is fully automated via the orchestrator.
 */

import type { Request, Response } from 'express';
import { persistService } from './persist.service.ts';
import type { ConsoleLine } from '../types.ts';

export const persistController = {
  /**
   * POST /api/console/logs
   *
   * Inject a single log line manually (e.g. from an agent tool).
   * Body: { projectId: number, kind: LineKind, text: string }
   */
  async injectLine(req: Request, res: Response): Promise<void> {
    const { projectId, kind, text } = req.body ?? {};

    if (!projectId || !kind || !text) {
      res.status(400).json({ ok: false, error: 'projectId, kind, and text are required' });
      return;
    }

    const line: ConsoleLine = {
      id: `manual-${Date.now()}`,
      projectId: Number(projectId),
      kind,
      text: String(text),
      ts: new Date(),
    };

    const result = await persistService.persistNow(line);
    res.status(result.ok ? 200 : 500).json(result);
  },
};
