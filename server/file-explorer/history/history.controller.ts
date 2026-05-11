import type { Request, Response } from 'express';
import { historyService } from './history.service.ts';
import type { SnapshotInput, DiffInput, HistoryAuthor } from './history.types.ts';

export class HistoryController {
  getHistory(req: Request, res: Response): void {
    const { projectId, filePath } = req.params;

    if (!projectId || !filePath) {
      res.status(400).json({ ok: false, error: 'Params required: projectId, filePath' });
      return;
    }

    const decodedPath = decodeURIComponent(filePath);
    const result = historyService.getHistory(projectId, decodedPath);
    res.status(200).json(result);
  }

  snapshot(req: Request, res: Response): void {
    const { projectId, filePath, content, author, message } = req.body as SnapshotInput;

    if (!projectId || !filePath || content === undefined) {
      res.status(400).json({ ok: false, error: 'Fields required: projectId, filePath, content' });
      return;
    }

    const result = historyService.snapshot({ projectId, filePath, content, author, message });
    res.status(result.ok ? 201 : 500).json(result);
  }

  getDiff(req: Request, res: Response): void {
    const { versionIdA, versionIdB } = req.query as Partial<DiffInput>;

    if (!versionIdA || !versionIdB) {
      res.status(400).json({ ok: false, error: 'Query params required: versionIdA, versionIdB' });
      return;
    }

    const result = historyService.diff({ versionIdA, versionIdB });
    res.status(result.ok ? 200 : 404).json(result);
  }

  async restoreVersion(req: Request, res: Response): Promise<void> {
    const { versionId } = req.params;

    if (!versionId) {
      res.status(400).json({ ok: false, error: 'Param required: versionId' });
      return;
    }

    const result = await historyService.restore(versionId);
    res.status(result.ok ? 200 : 404).json(result);
  }

  clearHistory(req: Request, res: Response): void {
    const { projectId, filePath } = req.params;

    if (!projectId || !filePath) {
      res.status(400).json({ ok: false, error: 'Params required: projectId, filePath' });
      return;
    }

    historyService.clearHistory(projectId, decodeURIComponent(filePath));
    res.status(200).json({ ok: true, action: 'history-cleared', projectId, filePath });
  }

  getStats(_req: Request, res: Response): void {
    const stats = historyService.getStats();
    res.status(200).json({ ok: true, ...stats });
  }

  healthCheck(_req: Request, res: Response): void {
    const stats = historyService.getStats();
    res.status(200).json({ ok: true, module: 'history', ...stats });
  }
}

export const historyController = new HistoryController();
