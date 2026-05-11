import type { Request, Response } from 'express';
import { watcherService } from './watcher.service.ts';
import type { WatchEventType } from './watcher.types.ts';

export class WatcherController {
  sseFiles(req: Request, res: Response): void {
    const projectId = req.query.projectId as string;

    if (!projectId) {
      res.status(400).json({ ok: false, error: 'Query param required: projectId' });
      return;
    }

    watcherService.registerClient(res, projectId);
  }

  broadcastChange(req: Request, res: Response): void {
    const { type, path, projectId, oldPath } = req.body as {
      type?: WatchEventType;
      path?: string;
      projectId?: string;
      oldPath?: string;
    };

    if (!path || !projectId) {
      res.status(400).json({ ok: false, error: 'Fields required: path, projectId' });
      return;
    }

    const result = watcherService.notifyFileChange(type ?? 'updated', path, projectId, oldPath);
    res.status(200).json(result);
  }

  getSnapshot(_req: Request, res: Response): void {
    const snapshot = watcherService.getSnapshot();
    res.status(200).json({ ok: true, ...snapshot });
  }

  getClientCount(req: Request, res: Response): void {
    const projectId = req.query.projectId as string | undefined;
    const count = watcherService.getClientCount(projectId);
    res.status(200).json({ ok: true, count, projectId: projectId ?? 'all' });
  }

  healthCheck(_req: Request, res: Response): void {
    const snapshot = watcherService.getSnapshot();
    res.status(200).json({
      ok: true,
      module: 'watcher',
      clients: snapshot.clientCount,
      projects: Object.keys(snapshot.byProject).length,
    });
  }
}

export const watcherController = new WatcherController();
