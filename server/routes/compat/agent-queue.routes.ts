import { Router, type Request, type Response } from "express";
import fs from "fs/promises";
import path from "path";
import { eq, desc } from "drizzle-orm";
import { db } from "../../db/index.ts";
import { diffQueue } from "../../../shared/schema.ts";
import { resolveProjectId } from "../../orchestration/active-project.ts";
import { resolveInSandbox } from "../../sandbox/sandbox.util.ts";
import { bus } from "../../events/bus.ts";
import { err } from "./_shared.ts";

export function registerAgentQueueRoutes(r: Router): void {
  r.get("/api/agent/queue", async (req: Request, res: Response) => {
    try {
      const projectId = await resolveProjectId(req);
      const rows = await db
        .select()
        .from(diffQueue)
        .where(eq(diffQueue.projectId, projectId))
        .orderBy(desc(diffQueue.createdAt));
      const items = rows.map((r) => ({
        id: String(r.id),
        path: r.filePath,
        status: r.status,
        oldContent: r.oldContent,
        newContent: r.newContent,
      }));
      res.json({ ok: true, items, data: { items } });
    } catch (e: any) {
      res.status(500).json(err("QUEUE_FAILED", e?.message || "queue failed"));
    }
  });

  r.post("/api/patches/batch/apply", async (req: Request, res: Response) => {
    const raw = (req.body || {}) as { patchIds?: unknown };
    const patchIds = Array.isArray(raw.patchIds) ? raw.patchIds : [];
    const batchId = `batch-${Date.now()}`;
    try {
      const projectId = await resolveProjectId(req);
      let applied = 0;
      for (const pid of patchIds) {
        const n = Number(pid);
        if (!Number.isFinite(n)) continue;
        const [row] = await db.select().from(diffQueue).where(eq(diffQueue.id, n));
        if (!row) continue;
        const abs = resolveInSandbox(projectId, row.filePath);
        await fs.mkdir(path.dirname(abs), { recursive: true });
        await fs.writeFile(abs, row.newContent ?? "", "utf-8");
        await db.update(diffQueue).set({ status: "applied" }).where(eq(diffQueue.id, n));
        bus.emit("file.change", { projectId, path: row.filePath, kind: "change", ts: Date.now() });
        applied++;
      }
      res.json({ ok: true, batchId, applied, data: { batchId, applied } });
    } catch (e: any) {
      res.status(500).json(err("APPLY_FAILED", e?.message || "batch apply failed"));
    }
  });

  r.post("/api/patches/batch/reject", async (req: Request, res: Response) => {
    const raw = (req.body || {}) as { patchIds?: unknown };
    const patchIds = Array.isArray(raw.patchIds) ? raw.patchIds : [];
    let rejected = 0;
    for (const pid of patchIds) {
      const n = Number(pid);
      if (!Number.isFinite(n)) continue;
      try {
        await db.update(diffQueue).set({ status: "rejected" }).where(eq(diffQueue.id, n));
        rejected++;
      } catch {
        /* ignore */
      }
    }
    res.json({ ok: true, rejected, data: { rejected } });
  });

  r.post("/api/patches/:id/apply", async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json(err("BAD_REQUEST", "invalid id"));
    try {
      const projectId = await resolveProjectId(req);
      const [row] = await db.select().from(diffQueue).where(eq(diffQueue.id, id));
      if (!row) return res.status(404).json(err("NOT_FOUND", "patch not found"));
      const abs = resolveInSandbox(projectId, row.filePath);
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, row.newContent ?? "", "utf-8");
      await db.update(diffQueue).set({ status: "applied" }).where(eq(diffQueue.id, id));
      bus.emit("file.change", { projectId, path: row.filePath, kind: "change", ts: Date.now() });
      res.json({ ok: true, data: { id, applied: true } });
    } catch (e: any) {
      res.status(500).json(err("APPLY_FAILED", e?.message || "apply failed"));
    }
  });

  r.get("/api/patches/:id/preview", async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json(err("BAD_REQUEST", "invalid id"));
    try {
      const [row] = await db.select().from(diffQueue).where(eq(diffQueue.id, id));
      if (!row) return res.status(404).json(err("NOT_FOUND", "patch not found"));
      res.json({
        ok: true,
        data: { id, path: row.filePath, oldContent: row.oldContent, newContent: row.newContent },
      });
    } catch (e: any) {
      res.status(500).json(err("PREVIEW_FAILED", e?.message || "preview failed"));
    }
  });

  r.post("/api/conflict/resolve", async (req: Request, res: Response) => {
    const { path: filePath, resolvedContent } = (req.body || {}) as {
      path?: string;
      resolvedContent?: string;
    };
    if (!filePath || resolvedContent === undefined) {
      return res.status(400).json(err("BAD_REQUEST", "path and resolvedContent required"));
    }
    try {
      const projectId = await resolveProjectId(req);
      const abs = resolveInSandbox(projectId, filePath);
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, resolvedContent, "utf-8");
      bus.emit("file.change", { projectId, path: filePath, kind: "change", ts: Date.now() });
      res.json({ ok: true, data: { path: filePath, resolved: true } });
    } catch (e: any) {
      res.status(500).json(err("RESOLVE_FAILED", e?.message || "resolve failed"));
    }
  });
}
