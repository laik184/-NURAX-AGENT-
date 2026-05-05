import { Router, type Request, type Response } from "express";
import fs from "fs/promises";
import path from "path";
import { resolveProjectId } from "../../orchestration/active-project.ts";
import { ensureProjectDir, resolveInSandbox } from "../../infrastructure/sandbox/sandbox.util.ts";
import { bus } from "../../infrastructure/events/bus.ts";
import { buildTree, err } from "./_shared.ts";

export function registerLegacyFileRoutes(r: Router): void {
  r.get("/api/list-files", async (req: Request, res: Response) => {
    try {
      const projectId = await resolveProjectId(req);
      const root = await ensureProjectDir(projectId);
      const tree = await buildTree(root);
      res.json({ ok: true, tree, data: { tree } });
    } catch (e: any) {
      res.status(500).json(err("LIST_FAILED", e?.message || "list-files failed"));
    }
  });

  r.get("/api/read-file", async (req: Request, res: Response) => {
    const p = (req.query.path as string) || "";
    if (!p) return res.status(400).json(err("BAD_REQUEST", "path query required"));
    try {
      const projectId = await resolveProjectId(req);
      const abs = resolveInSandbox(projectId, p);
      const content = await fs.readFile(abs, "utf-8");
      res.json({ ok: true, content, data: { path: p, content } });
    } catch (e: any) {
      res.status(404).json(err("READ_FAILED", e?.message || "read failed"));
    }
  });

  r.post("/api/save-file", async (req: Request, res: Response) => {
    const { filePath, content } = (req.body || {}) as { filePath?: string; content?: string };
    if (!filePath || content === undefined) {
      return res.status(400).json(err("BAD_REQUEST", "filePath and content required"));
    }
    try {
      const projectId = await resolveProjectId(req);
      const abs = resolveInSandbox(projectId, filePath);
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, content, "utf-8");
      bus.emit("file.change", { projectId, path: filePath, kind: "change", ts: Date.now() });
      res.json({ ok: true, data: { path: filePath, bytes: content.length } });
    } catch (e: any) {
      res.status(500).json(err("SAVE_FAILED", e?.message || "save failed"));
    }
  });

  r.post("/api/rename-file", async (req: Request, res: Response) => {
    const { oldPath, newPath } = (req.body || {}) as { oldPath?: string; newPath?: string };
    if (!oldPath || !newPath) {
      return res.status(400).json(err("BAD_REQUEST", "oldPath and newPath required"));
    }
    try {
      const projectId = await resolveProjectId(req);
      const absOld = resolveInSandbox(projectId, oldPath);
      const absNew = resolveInSandbox(projectId, newPath);
      await fs.mkdir(path.dirname(absNew), { recursive: true });
      await fs.rename(absOld, absNew);
      bus.emit("file.change", { projectId, path: oldPath, kind: "unlink", ts: Date.now() });
      bus.emit("file.change", { projectId, path: newPath, kind: "add", ts: Date.now() });
      res.json({ ok: true, data: { oldPath, newPath } });
    } catch (e: any) {
      res.status(500).json(err("RENAME_FAILED", e?.message || "rename failed"));
    }
  });

  r.post("/api/delete-file", async (req: Request, res: Response) => {
    const { targetPath } = (req.body || {}) as { targetPath?: string };
    if (!targetPath) return res.status(400).json(err("BAD_REQUEST", "targetPath required"));
    try {
      const projectId = await resolveProjectId(req);
      const abs = resolveInSandbox(projectId, targetPath);
      await fs.rm(abs, { recursive: true, force: true });
      bus.emit("file.change", { projectId, path: targetPath, kind: "unlink", ts: Date.now() });
      res.json({ ok: true, data: { path: targetPath, deleted: true } });
    } catch (e: any) {
      res.status(500).json(err("DELETE_FAILED", e?.message || "delete failed"));
    }
  });
}
