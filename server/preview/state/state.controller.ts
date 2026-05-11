import type { Request, Response } from 'express';
import { stateService } from './state.service.ts';
import type { UpdatePreviewStateInput } from './state.types.ts';

export class StateController {
  getState(_req: Request, res: Response): void {
    const result = stateService.get();
    res.status(200).json(result);
  }

  updateState(req: Request, res: Response): void {
    const { url, deviceType, devToolsTab, gridMode, gridPageIndex } =
      req.body as UpdatePreviewStateInput;

    const hasAnyField = [url, deviceType, devToolsTab, gridMode, gridPageIndex]
      .some(v => v !== undefined);

    if (!hasAnyField) {
      res.status(400).json({
        ok: false,
        error: 'Provide at least one: url, deviceType, devToolsTab, gridMode, gridPageIndex',
      });
      return;
    }

    const result = stateService.update({ url, deviceType, devToolsTab, gridMode, gridPageIndex });
    res.status(200).json(result);
  }

  resetState(_req: Request, res: Response): void {
    const result = stateService.reset();
    res.status(200).json(result);
  }

  setUrl(req: Request, res: Response): void {
    const { url } = req.body as { url?: string };
    if (!url) {
      res.status(400).json({ ok: false, error: 'Field required: url' });
      return;
    }
    const result = stateService.setUrl(url);
    res.status(200).json(result);
  }

  setDevice(req: Request, res: Response): void {
    const { deviceType } = req.body;
    if (!deviceType) {
      res.status(400).json({ ok: false, error: 'Field required: deviceType' });
      return;
    }
    const result = stateService.setDevice(deviceType);
    res.status(200).json(result);
  }

  setGridMode(req: Request, res: Response): void {
    const { gridMode, gridPageIndex } = req.body;
    if (typeof gridMode !== 'boolean') {
      res.status(400).json({ ok: false, error: 'Field required: gridMode (boolean)' });
      return;
    }
    const result = stateService.setGridMode(gridMode, gridPageIndex);
    res.status(200).json(result);
  }

  snapshot(_req: Request, res: Response): void {
    const state = stateService.snapshot();
    res.status(200).json({ ok: true, state });
  }

  healthCheck(_req: Request, res: Response): void {
    const state = stateService.snapshot();
    const expired = stateService.isExpired();
    res.status(200).json({
      ok: true,
      module: 'state',
      sessionId: state.sessionId,
      expired,
      lastUpdated: state.updatedAt,
    });
  }
}

export const stateController = new StateController();
