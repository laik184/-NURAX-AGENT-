import { Router, type Request, type Response } from "express";
import { db } from "../infrastructure/db/index.ts";
import { diffQueue } from "../../shared/schema.ts";
import { eq, desc } from "drizzle-orm";

export function createDiffRouter(): Router {
  const router = Router();

  router.get("/", async (req: Request, res: Response) => {
    try {
      const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
      let query = db.select().from(diffQueue).orderBy(desc(diffQueue.createdAt)).$dynamic();
      if (projectId) query = query.where(eq(diffQueue.projectId, projectId));
      const items = await query.limit(100);
      res.json({ ok: true, items });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.post("/", async (req: Request, res: Response) => {
    try {
      const { projectId, filePath, oldContent, newContent } = req.body;
      if (!projectId || !filePath) {
        return res.status(400).json({ ok: false, error: "projectId and filePath are required" });
      }
      const [item] = await db
        .insert(diffQueue)
        .values({ projectId: Number(projectId), filePath, oldContent, newContent, status: "pending" })
        .returning();
      res.status(201).json({ ok: true, item });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.patch("/:id/apply", async (req: Request, res: Response) => {
    try {
      const [item] = await db
        .update(diffQueue)
        .set({ status: "applied" })
        .where(eq(diffQueue.id, Number(req.params.id)))
        .returning();
      if (!item) return res.status(404).json({ ok: false, error: "Diff item not found" });
      res.json({ ok: true, item });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.delete("/:id", async (req: Request, res: Response) => {
    try {
      await db.delete(diffQueue).where(eq(diffQueue.id, Number(req.params.id)));
      res.json({ ok: true, deleted: true });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  return router;
}
