import { Router, type Request, type Response } from "express";
import { db } from "../infrastructure/db/index.ts";
import { agentRuns, agentEvents } from "../../shared/schema.ts";
import { eq, desc } from "drizzle-orm";

export function createAgentsRouter(): Router {
  const router = Router();

  router.get("/", async (_req: Request, res: Response) => {
    try {
      const runs = await db.select().from(agentRuns).orderBy(desc(agentRuns.startedAt)).limit(50);
      res.json({ ok: true, runs });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.get("/:runId", async (req: Request, res: Response) => {
    try {
      const [run] = await db.select().from(agentRuns).where(eq(agentRuns.id, req.params.runId));
      if (!run) return res.status(404).json({ ok: false, error: "Run not found" });
      res.json({ ok: true, run });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.get("/:runId/events", async (req: Request, res: Response) => {
    try {
      const events = await db
        .select()
        .from(agentEvents)
        .where(eq(agentEvents.runId, req.params.runId))
        .orderBy(agentEvents.ts);
      res.json({ ok: true, events });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  return router;
}
