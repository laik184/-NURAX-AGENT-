import { Router, type Request, type Response } from "express";
import { db } from "../db/index.ts";
import { projects } from "../../shared/schema.ts";
import { eq, desc } from "drizzle-orm";
import { ensureProjectDir, projectRoot } from "../sandbox/sandbox.util.ts";
import fs from "node:fs/promises";
import path from "node:path";

export function createProjectsRouter(): Router {
  const r = Router();

  r.get("/", async (_req: Request, res: Response) => {
    try {
      const rows = await db.select().from(projects).orderBy(desc(projects.createdAt));
      res.json({ ok: true, data: rows });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: { code: "DB_ERROR", message: e.message } });
    }
  });

  r.post("/", async (req: Request, res: Response) => {
    const { name, description, framework } = (req.body || {}) as {
      name?: string;
      description?: string;
      framework?: string;
    };
    if (!name || typeof name !== "string") {
      return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "name required" } });
    }
    try {
      const [row] = await db
        .insert(projects)
        .values({ name, description, framework, sandboxPath: "" })
        .returning();
      const sandboxPath = projectRoot(row.id);
      await db.update(projects).set({ sandboxPath }).where(eq(projects.id, row.id));
      await ensureProjectDir(row.id);
      res.json({ ok: true, data: { ...row, sandboxPath } });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: { code: "DB_ERROR", message: e.message } });
    }
  });

  r.get("/:id", async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "invalid id" } });
    }
    const [row] = await db.select().from(projects).where(eq(projects.id, id));
    if (!row) return res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "project" } });
    res.json({ ok: true, data: row });
  });

  r.patch("/:id", async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { name, description, framework, status } = (req.body || {}) as Record<string, string>;
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (name) update.name = name;
    if (description !== undefined) update.description = description;
    if (framework !== undefined) update.framework = framework;
    if (status !== undefined) update.status = status;
    const [row] = await db.update(projects).set(update).where(eq(projects.id, id)).returning();
    if (!row) return res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "project" } });
    res.json({ ok: true, data: row });
  });

  r.delete("/:id", async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "invalid id" } });
    }

    // Delete from DB (cascade removes agentRuns, consoleLogs, etc.)
    await db.delete(projects).where(eq(projects.id, id));

    // Cleanup sandbox directory — best-effort, never block the response
    const sandboxDir = projectRoot(id);
    fs.rm(sandboxDir, { recursive: true, force: true }).catch((err) => {
      console.warn(`[nura-x] sandbox cleanup failed for project ${id}:`, err.message);
    });

    res.json({ ok: true, data: { id, sandboxCleaned: true } });
  });

  return r;
}
