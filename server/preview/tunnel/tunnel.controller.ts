import type { Request, Response } from 'express';
import { tunnelService } from './tunnel.service.ts';
import type { AddPortInput } from './tunnel.types.ts';

export class TunnelController {
  getTunnelInfo(_req: Request, res: Response): void {
    const result = tunnelService.getTunnelInfo();
    res.status(result.ok ? 200 : 500).json(result);
  }

  listPorts(_req: Request, res: Response): void {
    const result = tunnelService.listPorts();
    res.status(200).json(result);
  }

  addPort(req: Request, res: Response): void {
    const { localPort, externalPort, label, protocol } = req.body as AddPortInput;

    if (!localPort || !externalPort) {
      res.status(400).json({ ok: false, error: 'Fields required: localPort, externalPort' });
      return;
    }

    if (typeof localPort !== 'number' || typeof externalPort !== 'number') {
      res.status(400).json({ ok: false, error: 'localPort and externalPort must be numbers' });
      return;
    }

    const result = tunnelService.addPort({ localPort, externalPort, label, protocol });
    const status = result.ok ? 201 : 409;
    res.status(status).json(result);
  }

  removePort(req: Request, res: Response): void {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ ok: false, error: 'Param required: id' });
      return;
    }

    const result = tunnelService.removePort(id);
    const status = result.ok ? 200 : 404;
    res.status(status).json(result);
  }

  getPublicUrl(_req: Request, res: Response): void {
    const url = tunnelService.getPublicUrl();
    res.status(200).json({ ok: true, url });
  }

  healthCheck(_req: Request, res: Response): void {
    const info = tunnelService.getTunnelInfo();
    res.status(200).json({
      ok: true,
      module: 'tunnel',
      isReplit: info.isReplit,
      domain: info.domain,
      port: info.port,
    });
  }
}

export const tunnelController = new TunnelController();
