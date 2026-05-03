import { Router, type Request, type Response } from "express";
import { db } from "../db/index.ts";
import { diffQueue } from "../../shared/schema.ts";
import { eq, and, desc } from "drizzle-orm";
import fs from "fs/promises";
import path from "path";
import { resolveInSandbox } from "../sandbox/sandbox.util.ts";
import { bus } from "../events/bus.ts";

export function createDiffRouter(): Router {
  const r = Router();

  r.get("/", async (req: Request, res: Response) => {
    const projectId = Number(req.query.projectId);
    if (!Number.isFinite(projectId)) {
      return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "projectId required" } });
    }
    const items = await db
      .select()
      .from(diffQueue)
      .where(and(eq(diffQueue.projectId, projectId), eq(diffQueue.status, "pending")))
      .orderBy(desc(diffQueue.createdAt));
    res.json({ ok: true, data: items });
  });

  r.post("/apply", async (req: Request, res: Response) => {
    const { id, projectId } = (req.body || {}) as { id?: number; projectId?: number };
    if (!id || !projectId) {
      return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "id and projectId required" } });
    }
    const [item] = await db.select().from(diffQueue).where(eq(diffQueue.id, id));
    if (!item) return res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "diff" } });
    try {
      const abs = resolveInSandbox(projectId, item.filePath);
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, item.newContent || "", "utf-8");
      await db.update(diffQueue).set({ status: "applied" }).where(eq(diffQueue.id, id));
      bus.emit("file.change", { projectId, path: item.filePath, kind: "change", ts: Date.now() });
      res.json({ ok: true, data: { id, applied: true } });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: { code: "APPLY_ERROR", message: e.message } });
    }
  });

  r.post("/reject", async (req: Request, res: Response) => {
    const { id } = (req.body || {}) as { id?: number };
    if (!id) return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "id required" } });
    await db.update(diffQueue).set({ status: "rejected" }).where(eq(diffQueue.id, id));
    res.json({ ok: true, data: { id, rejected: true } });
  });

  return r;
}
