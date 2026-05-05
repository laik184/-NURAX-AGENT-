import { Router, type Request, type Response } from "express";
import fs from "fs/promises";
import path from "path";
import { eq } from "drizzle-orm";
import { db } from "../../infrastructure/db/index.ts";
import { projects } from "../../../shared/schema.ts";
import { resolveProjectId } from "../../orchestration/active-project.ts";
import { ensureProjectDir } from "../../infrastructure/sandbox/sandbox.util.ts";
import { err } from "./_shared.ts";

export function registerProjectRoutes(r: Router): void {
  r.post("/api/project/save", async (req: Request, res: Response) => {
    try {
      const projectId = await resolveProjectId(req);
      const root = await ensureProjectDir(projectId);
      const meta = JSON.stringify(req.body ?? {}, null, 2);
      await fs.writeFile(path.join(root, ".project.json"), meta, "utf-8");
      await db.update(projects).set({ updatedAt: new Date() }).where(eq(projects.id, projectId));
      res.json({ ok: true, data: { projectId, saved: true } });
    } catch (e: any) {
      res.status(500).json(err("SAVE_FAILED", e?.message || "save failed"));
    }
  });

  r.post("/api/project/load", async (req: Request, res: Response) => {
    try {
      const projectId = await resolveProjectId(req);
      const root = await ensureProjectDir(projectId);
      let meta: any = {};
      try {
        meta = JSON.parse(await fs.readFile(path.join(root, ".project.json"), "utf-8"));
      } catch {
        meta = {};
      }
      const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
      res.json({ ok: true, data: { project, meta } });
    } catch (e: any) {
      res.status(500).json(err("LOAD_FAILED", e?.message || "load failed"));
    }
  });
}
