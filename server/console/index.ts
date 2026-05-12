/**
 * IQ 2000 — Console Pipeline Controller
 *
 * Single entry point for the entire console subsystem.
 *
 *   server/console/
 *   ├── types.ts                    ← shared types
 *   ├── console.orchestrator.ts     ← IQ 2000 master orchestrator
 *   ├── capture/                    ← attaches to child process stdio
 *   │   ├── capture.types.ts
 *   │   └── capture.service.ts
 *   ├── filter/                     ← classifies raw lines (stdout/stderr/system/error)
 *   │   ├── filter.types.ts
 *   │   ├── filter.service.ts
 *   │   └── filter.utils.ts
 *   ├── persist/                    ← batch-writes to console_logs table
 *   │   ├── persist.types.ts
 *   │   ├── persist.service.ts
 *   │   ├── persist.controller.ts
 *   │   └── persist.router.ts
 *   ├── stream/                     ← SSE fan-out to browser clients
 *   │   ├── stream.types.ts
 *   │   ├── stream.service.ts
 *   │   ├── stream.controller.ts
 *   │   └── stream.router.ts
 *   └── history/                    ← reads persisted logs from DB
 *       ├── history.types.ts
 *       ├── history.service.ts
 *       ├── history.controller.ts
 *       └── history.router.ts
 *
 * Usage in main.ts:
 *   import consolePipeline from './console/index.ts';
 *   app.use('/api', consolePipeline);
 */

import { Router } from 'express';
import { consoleOrchestrator } from './console.orchestrator.ts';
import streamRouter  from './stream/stream.router.ts';
import persistRouter from './persist/persist.router.ts';
import historyRouter from './history/history.router.ts';

// ─── Pipeline Stage Registry ──────────────────────────────────────────────

interface PipelineStage {
  name: string;
  router: Router;
  mountPath: string;
}

const PIPELINE_STAGES: PipelineStage[] = [
  { name: 'stream',  router: streamRouter,  mountPath: '/' },
  { name: 'persist', router: persistRouter, mountPath: '/' },
  { name: 'history', router: historyRouter, mountPath: '/' },
];

// ─── Pipeline Controller ──────────────────────────────────────────────────

class ConsolePipelineController {
  private router: Router;
  private booted = false;

  constructor() {
    this.router = Router();
  }

  /**
   * Boot the pipeline:
   *  1. Initialize the IQ 2000 orchestrator (wires capture → persist + stream)
   *  2. Mount all stage routers under /api
   *  3. Register /api/console/health and /api/console/meta endpoints
   */
  boot(): Router {
    if (this.booted) return this.router;

    consoleOrchestrator.init();

    this.mountStages();
    this.registerHealthEndpoint();
    this.registerMetaEndpoint();

    this.booted = true;
    console.log(
      '[IQ2000] Console pipeline booted — stages:',
      PIPELINE_STAGES.map((s) => s.name).join(', '),
    );

    return this.router;
  }

  // ─── Stage mounting ──────────────────────────────────────────────────────

  private mountStages(): void {
    for (const stage of PIPELINE_STAGES) {
      this.router.use(stage.mountPath, stage.router);
      console.log(`[IQ2000] Console stage mounted: [${stage.name}] at ${stage.mountPath}`);
    }
  }

  // ─── Health endpoint ─────────────────────────────────────────────────────

  /**
   * GET /api/console/health
   * Aggregate health of all five pipeline modules.
   */
  private registerHealthEndpoint(): void {
    this.router.get('/console/health', (_req, res) => {
      const health = consoleOrchestrator.getHealth();
      const httpStatus = health.status === 'ready' ? 200 : 503;
      res.status(httpStatus).json(health);
    });
  }

  // ─── Meta endpoint ───────────────────────────────────────────────────────

  /**
   * GET /api/console/meta
   * Pipeline manifest — lists stages, routes, and current module statuses.
   */
  private registerMetaEndpoint(): void {
    this.router.get('/console/meta', (_req, res) => {
      res.status(200).json({
        ok: true,
        pipeline: 'IQ 2000 Console Pipeline',
        version: '1.0.0',
        stages: PIPELINE_STAGES.map((s) => s.name),
        endpoints: {
          stream: [
            'GET  /api/console/stream?projectId=<n>    → SSE log feed',
            'GET  /api/console/stream/snapshot          → active client list',
          ],
          persist: [
            'POST /api/console/logs                     → inject a log line',
          ],
          history: [
            'GET    /api/console/history?projectId=<n>  → paginated log history',
            'DELETE /api/console/history?projectId=<n>  → clear project logs',
          ],
          health: [
            'GET /api/console/health',
            'GET /api/console/meta',
          ],
        },
      });
    });
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────

const pipeline = new ConsolePipelineController();
const consolePipeline = pipeline.boot();

export default consolePipeline;
export { consoleOrchestrator };
