import { Router, type Request, type Response } from "express";
import { db } from "../db/index.ts";
import { agentRuns, agentEvents, chatMessages } from "../../shared/schema.ts";
import { eq, desc } from "drizzle-orm";

export function createTimelineRouter(): Router {
  const r = Router();

  r.get("/", async (req: Request, res: Response) => {
    const projectId = Number(req.query.projectId);
    if (!Number.isFinite(projectId)) {
      return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "projectId required" } });
    }
    const runs = await db
      .select()
      .from(agentRuns)
      .where(eq(agentRuns.projectId, projectId))
      .orderBy(desc(agentRuns.startedAt))
      .limit(50);

    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.projectId, projectId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(100);

    const recentRunIds = runs.slice(0, 10).map((r) => r.id);
    const events = recentRunIds.length
      ? await db
          .select()
          .from(agentEvents)
          .where(eq(agentEvents.runId, recentRunIds[0]))
          .orderBy(desc(agentEvents.ts))
          .limit(200)
      : [];

    res.json({ ok: true, data: { runs, messages, events } });
  });

  return r;
}
