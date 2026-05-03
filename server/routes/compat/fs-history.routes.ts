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

export function registerFsHistoryRoutes(r: Router): void {
  r.get("/api/fs/history", async (req: Request, res: Response) => {
    const filePath = (req.query.path as string) || "";
    try {
      const projectId = await resolveProjectId(req);
      const rows = await db
        .select()
        .from(diffQueue)
        .where(eq(diffQueue.projectId, projectId))
        .orderBy(desc(diffQueue.createdAt));
      const history = rows
        .filter((r) => !filePath || r.filePath === filePath)
        .map((r) => ({
          id: String(r.id),
          versionId: String(r.id),
          path: r.filePath,
          status: r.status,
          createdAt: r.createdAt,
        }));
      res.json({ ok: true, history, data: { history } });
    } catch (e: any) {
      res.status(500).json(err("HISTORY_FAILED", e?.message || "history failed"));
    }
  });

  r.get("/api/fs/timeline", async (req: Request, res: Response) => {
    const filePath = (req.query.path as string) || "";
    try {
      const projectId = await resolveProjectId(req);
      const rows = await db
        .select()
        .from(diffQueue)
        .where(eq(diffQueue.projectId, projectId))
        .orderBy(desc(diffQueue.createdAt));
      const timeline = rows
        .filter((r) => !filePath || r.filePath === filePath)
        .map((r) => ({
          id: String(r.id),
          path: r.filePath,
          status: r.status,
          createdAt: r.createdAt,
        }));
      res.json({ ok: true, timeline, data: { timeline } });
    } catch (e: any) {
      res.status(500).json(err("TIMELINE_FAILED", e?.message || "timeline failed"));
    }
  });

  r.get("/api/fs/commit", async (req: Request, res: Response) => {
    const filePath = (req.query.path as string) || "";
    const id = Number(req.query.id);
    if (!filePath || !Number.isFinite(id)) {
      return res.status(400).json(err("BAD_REQUEST", "path and id required"));
    }
    try {
      const [row] = await db.select().from(diffQueue).where(eq(diffQueue.id, id));
      if (!row) return res.status(404).json(err("NOT_FOUND", "version not found"));
      res.json({
        ok: true,
        data: { path: filePath, content: row.newContent ?? "", versionId: String(row.id) },
      });
    } catch (e: any) {
      res.status(500).json(err("COMMIT_FAILED", e?.message || "commit lookup failed"));
    }
  });

  r.post("/api/fs/rollback", async (req: Request, res: Response) => {
    const { path: filePath, versionId } = (req.body || {}) as {
      path?: string;
      versionId?: string | number;
    };
    if (!filePath || versionId === undefined) {
      return res.status(400).json(err("BAD_REQUEST", "path and versionId required"));
    }
    try {
      const projectId = await resolveProjectId(req);
      const [row] = await db.select().from(diffQueue).where(eq(diffQueue.id, Number(versionId)));
      if (!row) return res.status(404).json(err("NOT_FOUND", "version not found"));
      const restore = row.oldContent ?? row.newContent ?? "";
      const abs = resolveInSandbox(projectId, filePath);
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, restore, "utf-8");
      bus.emit("file.change", { projectId, path: filePath, kind: "change", ts: Date.now() });
      res.json({ ok: true, data: { path: filePath, restoredFrom: versionId } });
    } catch (e: any) {
      res.status(500).json(err("ROLLBACK_FAILED", e?.message || "rollback failed"));
    }
  });
}
