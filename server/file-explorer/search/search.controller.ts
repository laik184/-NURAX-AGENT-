import type { Request, Response } from 'express';
import { searchService } from './search.service.ts';
import type { SearchQuery, SearchMode } from './search.types.ts';

export class SearchController {
  async searchFiles(req: Request, res: Response): Promise<void> {
    const q = req.query.q as string;
    const projectPath = req.query.projectPath as string;
    const mode = (req.query.mode as SearchMode) ?? 'both';
    const caseSensitive = req.query.caseSensitive === 'true';
    const maxResults = req.query.maxResults ? Number(req.query.maxResults) : undefined;
    const fileTypes = req.query.fileTypes
      ? (req.query.fileTypes as string).split(',')
      : undefined;

    if (!q) {
      res.status(400).json({ ok: false, error: 'Query param required: q' });
      return;
    }

    if (!projectPath) {
      res.status(400).json({ ok: false, error: 'Query param required: projectPath' });
      return;
    }

    const query: SearchQuery = { q, projectPath, mode, caseSensitive, maxResults, fileTypes };
    const result = await searchService.search(query);

    res.status(result.ok ? 200 : 500).json(result);
  }

  invalidateIndex(req: Request, res: Response): void {
    const projectPath = req.query.projectPath as string;

    if (!projectPath) {
      res.status(400).json({ ok: false, error: 'Query param required: projectPath' });
      return;
    }

    searchService.invalidateIndex(projectPath);
    res.status(200).json({ ok: true, action: 'index-invalidated', projectPath });
  }

  healthCheck(_req: Request, res: Response): void {
    res.status(200).json({ ok: true, module: 'search' });
  }
}

export const searchController = new SearchController();
