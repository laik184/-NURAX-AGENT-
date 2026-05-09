import { Router, type Request, type Response } from "express";
import { db } from "../infrastructure/db/index.ts";
import { projects } from "../../shared/schema.ts";
import { eq, desc } from "drizzle-orm";
import { ensureProjectDir } from "../infrastructure/sandbox/sandbox.util.ts";

export function createProjectsRouter(): Router {
  const router = Router();

  router.get("/", async (_req: Request, res: Response) => {
    try {
      const all = await db.select().from(projects).orderBy(desc(projects.updatedAt));
      res.json({ ok: true, projects: all });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.get("/:id", async (req: Request, res: Response) => {
    try {
      const [project] = await db.select().from(projects).where(eq(projects.id, Number(req.params.id)));
      if (!project) return res.status(404).json({ ok: false, error: "Project not found" });
      res.json({ ok: true, project });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.post("/", async (req: Request, res: Response) => {
    try {
      const { name, description, framework } = req.body;
      if (!name) return res.status(400).json({ ok: false, error: "name is required" });
      const [project] = await db
        .insert(projects)
        .values({ name, description, framework, status: "idle" })
        .returning();
      await ensureProjectDir(project.id);
      res.status(201).json({ ok: true, project });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.patch("/:id", async (req: Request, res: Response) => {
    try {
      const { name, description, framework, status } = req.body;
      const [project] = await db
        .update(projects)
        .set({ name, description, framework, status, updatedAt: new Date() })
        .where(eq(projects.id, Number(req.params.id)))
        .returning();
      if (!project) return res.status(404).json({ ok: false, error: "Project not found" });
      res.json({ ok: true, project });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.delete("/:id", async (req: Request, res: Response) => {
    try {
      await db.delete(projects).where(eq(projects.id, Number(req.params.id)));
      res.json({ ok: true, deleted: true });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  return router;
}
