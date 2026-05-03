import { Router, type Request, type Response } from "express";
import { db } from "../db/index.ts";
import { artifacts } from "../../shared/schema.ts";
import { eq, desc } from "drizzle-orm";

export function createArtifactsRouter(): Router {
  const r = Router();

  r.get("/", async (req: Request, res: Response) => {
    const projectId = Number(req.query.projectId);
    if (!Number.isFinite(projectId)) {
      return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "projectId required" } });
    }
    const items = await db
      .select()
      .from(artifacts)
      .where(eq(artifacts.projectId, projectId))
      .orderBy(desc(artifacts.createdAt))
      .limit(200);
    res.json({ ok: true, data: items });
  });

  return r;
}
