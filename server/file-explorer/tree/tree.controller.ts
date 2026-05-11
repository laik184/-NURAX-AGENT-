import type { Request, Response } from 'express';
import { treeService } from './tree.service.ts';
import type { ListTreeInput, SortOrder } from './tree.types.ts';

export class TreeController {
  listFiles(req: Request, res: Response): void {
    const projectPath = req.query.projectPath as string;
    const depth = req.query.depth ? Number(req.query.depth) : undefined;
    const includeHidden = req.query.includeHidden === 'true';
    const sortBy = (req.query.sortBy as SortOrder) ?? 'name-asc';

    if (!projectPath) {
      res.status(400).json({ ok: false, error: 'Query param required: projectPath' });
      return;
    }

    const input: ListTreeInput = { projectPath, depth, includeHidden, sortBy };
    const result = treeService.list(input);

    res.status(result.ok ? 200 : 404).json(result);
  }

  flattenFiles(req: Request, res: Response): void {
    const projectPath = req.query.projectPath as string;

    if (!projectPath) {
      res.status(400).json({ ok: false, error: 'Query param required: projectPath' });
      return;
    }

    const result = treeService.flatten(projectPath);
    res.status(result.ok ? 200 : 500).json(result);
  }

  checkExists(req: Request, res: Response): void {
    const filePath = req.query.filePath as string;

    if (!filePath) {
      res.status(400).json({ ok: false, error: 'Query param required: filePath' });
      return;
    }

    const exists = treeService.exists(filePath);
    const isDirectory = exists ? treeService.isDirectory(filePath) : false;

    res.status(200).json({ ok: true, filePath, exists, isDirectory });
  }

  healthCheck(_req: Request, res: Response): void {
    res.status(200).json({ ok: true, module: 'tree' });
  }
}

export const treeController = new TreeController();
