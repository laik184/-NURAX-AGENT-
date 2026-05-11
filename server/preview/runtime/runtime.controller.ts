import type { Request, Response } from 'express';
import { runtimeService } from './runtime.service.ts';
import type { RunProjectInput, StopProjectInput, RestartProjectInput } from './runtime.types.ts';

export class RuntimeController {
  async runProject(req: Request, res: Response): Promise<void> {
    const { id, projectPath, command, port, env } = req.body as RunProjectInput;

    if (!id || !projectPath) {
      res.status(400).json({ ok: false, error: 'Fields required: id, projectPath' });
      return;
    }

    const result = await runtimeService.run({ id, projectPath, command, port, env });
    const status = result.ok ? 200 : 409;
    res.status(status).json(result);
  }

  async stopProject(req: Request, res: Response): Promise<void> {
    const { id, signal, timeoutMs } = req.body as StopProjectInput;

    if (!id) {
      res.status(400).json({ ok: false, error: 'Field required: id' });
      return;
    }

    const result = await runtimeService.stop({ id, signal, timeoutMs });
    const status = result.ok ? 200 : 404;
    res.status(status).json(result);
  }

  async restartProject(req: Request, res: Response): Promise<void> {
    const { id, projectPath, command, port, reloadType } = req.body as RestartProjectInput;

    if (!id || !projectPath) {
      res.status(400).json({ ok: false, error: 'Fields required: id, projectPath' });
      return;
    }

    const result = await runtimeService.restart({ id, projectPath, command, port, reloadType });
    const status = result.ok ? 200 : 500;
    res.status(status).json(result);
  }

  getStatus(_req: Request, res: Response): void {
    const result = runtimeService.getStatus();
    res.status(200).json(result);
  }

  getProcess(req: Request, res: Response): void {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ ok: false, error: 'Param required: id' });
      return;
    }

    const proc = runtimeService.getProcess(id);
    if (!proc) {
      res.status(404).json({ ok: false, error: `No process found for id: ${id}` });
      return;
    }

    res.status(200).json({ ok: true, process: proc });
  }

  healthCheck(_req: Request, res: Response): void {
    const { running, total } = runtimeService.getStatus();
    res.status(200).json({
      ok: true,
      module: 'runtime',
      runningCount: running.filter(p => p.status === 'running').length,
      total,
    });
  }
}

export const runtimeController = new RuntimeController();
