import { Router, type Request, type Response } from "express";
import { db } from "../infrastructure/db/index.ts";
import { agentRuns, agentEvents } from "../../shared/schema.ts";
import { eq, desc, gte } from "drizzle-orm";

export function createTimelineRouter(): Router {
  const router = Router();

  router.get("/:projectId", async (req: Request, res: Response) => {
    try {
      const projectId = Number(req.params.projectId);
      const limit = Number(req.query.limit) || 20;
      const since = req.query.since ? new Date(req.query.since as string) : undefined;

      let query = db
        .select()
        .from(agentRuns)
        .where(eq(agentRuns.projectId, projectId))
        .orderBy(desc(agentRuns.startedAt))
        .$dynamic();

      if (since) {
        query = query.where(gte(agentRuns.startedAt, since));
      }

      const runs = await query.limit(limit);
      res.json({ ok: true, projectId, timeline: runs });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.get("/:projectId/events", async (req: Request, res: Response) => {
    try {
      const projectId = Number(req.params.projectId);
      const runId = req.query.runId as string;
      if (!runId) return res.status(400).json({ ok: false, error: "runId query param required" });
      const events = await db
        .select()
        .from(agentEvents)
        .where(eq(agentEvents.runId, runId))
        .orderBy(agentEvents.ts)
        .limit(500);
      res.json({ ok: true, projectId, runId, events });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  return router;
}
