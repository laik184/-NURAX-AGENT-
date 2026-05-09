import { Router, type Request, type Response } from "express";
import { db } from "../infrastructure/db/index.ts";
import { artifacts } from "../../shared/schema.ts";
import { eq, desc } from "drizzle-orm";

export function createArtifactsRouter(): Router {
  const router = Router();

  router.get("/", async (req: Request, res: Response) => {
    try {
      const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
      let query = db.select().from(artifacts).orderBy(desc(artifacts.createdAt)).$dynamic();
      if (projectId) query = query.where(eq(artifacts.projectId, projectId));
      const all = await query.limit(100);
      res.json({ ok: true, artifacts: all });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.post("/", async (req: Request, res: Response) => {
    try {
      const { projectId, kind, path, meta } = req.body;
      if (!projectId) return res.status(400).json({ ok: false, error: "projectId is required" });
      const [artifact] = await db
        .insert(artifacts)
        .values({ projectId: Number(projectId), kind, path, meta })
        .returning();
      res.status(201).json({ ok: true, artifact });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.delete("/:id", async (req: Request, res: Response) => {
    try {
      await db.delete(artifacts).where(eq(artifacts.id, Number(req.params.id)));
      res.json({ ok: true, deleted: true });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  return router;
}
