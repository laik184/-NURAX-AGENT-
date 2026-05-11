/**
 * IQ2000 — File Explorer Pipeline Controller
 *
 * Single entry point for all file-explorer module routes.
 * Boots the orchestrator, mounts 5 stage routers,
 * and exposes aggregate health at GET /api/file-explorer/health.
 *
 * Usage in main.ts:
 *   import fileExplorerPipeline from './file-explorer/index.ts';
 *   app.use('/api', fileExplorerPipeline);
 */

import { Router } from 'express';
import { fileExplorerOrchestrator } from './file-explorer.orchestrator.ts';
import treeRouter    from './tree/tree.router.ts';
import crudRouter    from './crud/crud.router.ts';
import searchRouter  from './search/search.router.ts';
import historyRouter from './history/history.router.ts';
import watcherRouter from './watcher/watcher.router.ts';

// ─── Pipeline Stage Registry ───────────────────────────────────────────────────

interface PipelineStage {
  name: string;
  router: Router;
}

const PIPELINE_STAGES: PipelineStage[] = [
  { name: 'tree',    router: treeRouter    },
  { name: 'crud',    router: crudRouter    },
  { name: 'search',  router: searchRouter  },
  { name: 'history', router: historyRouter },
  { name: 'watcher', router: watcherRouter },
];

// ─── Pipeline Controller ────────────────────────────────────────────────────────

class FileExplorerPipelineController {
  private router: Router;
  private booted = false;

  constructor() {
    this.router = Router();
  }

  /**
   * Boot sequence:
   * 1. Init orchestrator (cross-module wiring)
   * 2. Mount all stage routers
   * 3. Register health + meta endpoints
   */
  boot(): Router {
    if (this.booted) return this.router;

    fileExplorerOrchestrator.init();

    this.mountStages();
    this.registerHealthEndpoint();
    this.registerMetaEndpoint();

    this.booted = true;
    console.log('[IQ2000] File Explorer pipeline booted — stages:', PIPELINE_STAGES.map(s => s.name).join(', '));

    return this.router;
  }

  /**
   * Mount all 5 pipeline stages in order.
   * Each stage is fully self-contained (router → controller → service → types).
   */
  private mountStages(): void {
    for (const stage of PIPELINE_STAGES) {
      this.router.use('/', stage.router);
      console.log(`[IQ2000] File Explorer stage mounted: [${stage.name}]`);
    }
  }

  /**
   * Aggregate health — all 5 modules via orchestrator.
   * GET /api/file-explorer/health
   */
  private registerHealthEndpoint(): void {
    this.router.get('/file-explorer/health', (_req, res) => {
      const health = fileExplorerOrchestrator.getHealth();
      res.status(health.status === 'ready' ? 200 : 503).json(health);
    });
  }

  /**
   * Pipeline metadata — lists all stages and endpoints for dev tooling.
   * GET /api/file-explorer/meta
   */
  private registerMetaEndpoint(): void {
    this.router.get('/file-explorer/meta', (_req, res) => {
      res.status(200).json({
        ok: true,
        pipeline: 'IQ2000 File Explorer Pipeline',
        version: '1.0.0',
        stages: PIPELINE_STAGES.map(s => s.name),
        endpoints: {
          tree: [
            'GET /api/list-files?projectPath=',
            'GET /api/flatten-files?projectPath=',
            'GET /api/file-exists?filePath=',
          ],
          crud: [
            'GET  /api/read-file?filePath=',
            'POST /api/save-file',
            'POST /api/rename-file',
            'POST /api/delete-file',
            'POST /api/create-folder',
          ],
          search: [
            'GET    /api/search-files?q=&projectPath=',
            'DELETE /api/search-index?projectPath=',
          ],
          history: [
            'GET    /api/file-history/:projectId/:filePath',
            'POST   /api/file-history/snapshot',
            'GET    /api/file-history/diff?versionIdA=&versionIdB=',
            'POST   /api/file-history/restore/:versionId',
            'DELETE /api/file-history/:projectId/:filePath',
            'GET    /api/file-history/stats',
          ],
          watcher: [
            'GET  /sse/files?projectId=',
            'POST /api/watcher/broadcast',
            'GET  /api/watcher/snapshot',
            'GET  /api/watcher/clients',
          ],
          meta: [
            'GET /api/file-explorer/health',
            'GET /api/file-explorer/meta',
          ],
        },
      });
    });
  }

  getRouter(): Router {
    return this.router;
  }
}

// ─── Singleton Export ──────────────────────────────────────────────────────────

const pipeline = new FileExplorerPipelineController();
const fileExplorerPipeline = pipeline.boot();

export default fileExplorerPipeline;
export { fileExplorerOrchestrator };
