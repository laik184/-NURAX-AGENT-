import { Router, type Request, type Response } from "express";
import { db } from "../infrastructure/db/index.ts";
import { projects } from "../../shared/schema.ts";
import { eq } from "drizzle-orm";
import { runtimeManager } from "../infrastructure/runtime/runtime-manager.ts";

export function createPublishingRouter(): Router {
  const router = Router();

  router.post("/publish/:projectId", async (req: Request, res: Response) => {
    try {
      const projectId = Number(req.params.projectId);
      const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
      if (!project) return res.status(404).json({ ok: false, error: "Project not found" });

      await db.update(projects).set({ status: "published", updatedAt: new Date() }).where(eq(projects.id, projectId));

      const publishUrl = runtimeManager.previewUrl(projectId);

      res.json({
        ok: true,
        projectId,
        published: true,
        url: publishUrl,
        message: `Project "${project.name}" published at ${publishUrl}`,
      });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.get("/status/:projectId", async (req: Request, res: Response) => {
    try {
      const projectId = Number(req.params.projectId);
      const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
      if (!project) return res.status(404).json({ ok: false, error: "Project not found" });
      res.json({ ok: true, projectId, status: project.status, name: project.name });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  return router;
}
