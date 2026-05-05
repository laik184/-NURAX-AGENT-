import { Router, type Request, type Response } from "express";
import { db } from "../infrastructure/db/index.ts";
import { projects } from "../../shared/schema.ts";
import { eq } from "drizzle-orm";

export function createPublishingRouter(): Router {
  const r = Router();

  r.get("/status", async (req: Request, res: Response) => {
    const projectId = Number(req.query.projectId);
    if (!Number.isFinite(projectId)) {
      return res.json({ ok: true, data: { status: "not_published" } });
    }
    const [row] = await db.select().from(projects).where(eq(projects.id, projectId));
    res.json({
      ok: true,
      data: {
        status: row?.status === "published" ? "published" : "not_published",
        projectId,
      },
    });
  });

  r.post("/deploy", async (req: Request, res: Response) => {
    const { projectId } = (req.body || {}) as { projectId?: number };
    if (!projectId) {
      return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "projectId required" } });
    }
    await db.update(projects).set({ status: "published", updatedAt: new Date() }).where(eq(projects.id, projectId));
    res.json({
      ok: true,
      data: { projectId, status: "published", deployedAt: Date.now(), note: "Stub deployment — wire to real publisher later" },
    });
  });

  return r;
}
