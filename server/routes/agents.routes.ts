import { Router, Request, Response } from 'express';
import { executePipeline, getMetrics, getRegistryStats, ORCHESTRATOR_REGISTRY } from '../agents/core/pipeline/index.ts';

export function createAgentsRouter(): Router {
  const router = Router();

  // POST /api/agents/run — main pipeline entry point
  router.post('/run', async (req: Request, res: Response): Promise<void> => {
    const { input, sessionId, context, allowDestructive, maxFeedbackAttempts } = req.body as {
      input?: unknown;
      sessionId?: string;
      context?: Record<string, unknown>;
      allowDestructive?: boolean;
      maxFeedbackAttempts?: number;
    };

    if (!input || typeof input !== 'string' || input.trim().length === 0) {
      res.status(400).json({
        error: 'Bad Request',
        message: '`input` is required and must be a non-empty string',
      });
      return;
    }

    try {
      const result = await executePipeline({
        requestId: `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        input,
        sessionId,
        context,
        allowDestructive: allowDestructive ?? false,
        maxFeedbackAttempts: maxFeedbackAttempts ?? 3,
      });

      res.status(result.success ? 200 : 422).json({
        requestId: result.requestId,
        success: result.success,
        status: result.status,
        finalPhase: result.finalPhase,
        totalDurationMs: result.totalDurationMs,
        phases: result.phases.map((p) => ({
          phase: p.phase,
          success: p.success,
          durationMs: p.durationMs,
          error: p.error,
        })),
        ...(result.error ? { error: result.error } : {}),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: 'Internal Server Error', message });
    }
  });

  // GET /api/agents/metrics — pipeline run metrics
  router.get('/metrics', (_req: Request, res: Response): void => {
    const m = getMetrics();
    res.json({
      totalRuns: m.totalRuns,
      successCount: m.successCount,
      failureCount: m.failureCount,
      avgDurationMs: m.avgDurationMs,
      successRate: m.totalRuns > 0
        ? Math.round((m.successCount / m.totalRuns) * 100)
        : null,
      phaseFailureCounts: m.phaseFailureCounts,
    });
  });

  // GET /api/agents/registry — all registered orchestrators
  router.get('/registry', (_req: Request, res: Response): void => {
    const stats = getRegistryStats();
    res.json({
      stats,
      orchestrators: ORCHESTRATOR_REGISTRY.map((e) => ({
        id: e.id,
        domain: e.domain,
        description: e.description,
        capabilities: e.capabilities,
      })),
    });
  });

  // GET /api/agents/health — liveness check
  router.get('/health', (_req: Request, res: Response): void => {
    res.json({
      status: 'ok',
      pipeline: 'ready',
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
