import type { Request, Response } from 'express';
import { devtoolsService } from './devtools.service.ts';
import type { SseChannel, LogLevel } from './devtools.types.ts';

export class DevtoolsController {
  sseConsole(req: Request, res: Response): void {
    const projectId = req.query.projectId as string | undefined;
    devtoolsService.registerClient(res, 'console', projectId);
  }

  ssePreview(req: Request, res: Response): void {
    const projectId = req.query.projectId as string | undefined;
    devtoolsService.registerClient(res, 'preview', projectId);
  }

  sseReload(_req: Request, res: Response): void {
    devtoolsService.registerClient(res, 'reload');
  }

  pushLog(req: Request, res: Response): void {
    const { type, message, source, projectId } = req.body as {
      type?: LogLevel;
      message?: string;
      source?: string;
      projectId?: string;
    };

    if (!message) {
      res.status(400).json({ ok: false, error: 'Field required: message' });
      return;
    }

    const log = devtoolsService.pushConsoleLog({
      type: type ?? 'log',
      message,
      source,
      projectId,
    });

    res.status(201).json({ ok: true, log });
  }

  broadcastReload(_req: Request, res: Response): void {
    devtoolsService.signalReload();
    res.status(200).json({ ok: true, action: 'reload-broadcasted' });
  }

  clearLogs(_req: Request, res: Response): void {
    devtoolsService.clearLogs();
    res.status(200).json({ ok: true, action: 'logs-cleared' });
  }

  getSnapshot(_req: Request, res: Response): void {
    const snapshot = devtoolsService.getSnapshot();
    res.status(200).json({ ok: true, ...snapshot });
  }

  healthCheck(_req: Request, res: Response): void {
    const snapshot = devtoolsService.getSnapshot();
    res.status(200).json({
      ok: true,
      module: 'devtools',
      clients: snapshot.clientCount,
      byChannel: snapshot.byChannel,
    });
  }
}

export const devtoolsController = new DevtoolsController();
