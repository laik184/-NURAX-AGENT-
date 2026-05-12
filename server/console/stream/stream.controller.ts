/**
 * IQ 2000 — Console · Stream Controller
 *
 * Handles the SSE handshake: registers the client, keeps the connection
 * alive with heartbeats, and cleans up on disconnect.
 */

import type { Request, Response } from 'express';
import { streamService } from './stream.service.ts';

const HEARTBEAT_INTERVAL_MS = 25_000;

export const streamController = {
  /**
   * GET /api/console/stream?projectId=<n>
   *
   * Upgrades the HTTP connection to an SSE channel scoped to one project.
   */
  subscribe(req: Request, res: Response): void {
    const projectId = Number(req.query['projectId']);

    if (!projectId || isNaN(projectId)) {
      res.status(400).json({ ok: false, error: 'projectId query param is required' });
      return;
    }

    const clientId = streamService.addClient(projectId, res);

    // Keep-alive heartbeat — prevents proxy / load-balancer timeouts
    const heartbeat = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        clearInterval(heartbeat);
      }
    }, HEARTBEAT_INTERVAL_MS);

    req.on('close', () => {
      clearInterval(heartbeat);
      streamService.removeClient(clientId);
    });

    req.on('error', () => {
      clearInterval(heartbeat);
      streamService.removeClient(clientId);
    });
  },

  /**
   * GET /api/console/stream/snapshot
   *
   * Returns metadata about all active SSE connections (dev/debug use).
   */
  snapshot(_req: Request, res: Response): void {
    res.json({ ok: true, snapshot: streamService.getSnapshot() });
  },
};
