import { Router, type Request, type Response } from "express";
import fs from "fs/promises";
import path from "path";
import { resolveProjectId } from "../../orchestration/active-project.ts";
import { ensureProjectDir, resolveInSandbox } from "../../infrastructure/sandbox/sandbox.util.ts";
import { bus } from "../../infrastructure/events/bus.ts";
import { buildTree, err, upload } from "./_shared.ts";

export function registerFilesModalRoutes(r: Router): void {
  r.get("/api/files/list", async (req: Request, res: Response) => {
    try {
      const projectId = await resolveProjectId(req);
      const root = await ensureProjectDir(projectId);
      const tree = await buildTree(root);
      res.json({ ok: true, files: tree, data: { files: tree } });
    } catch (e: any) {
      res.status(500).json(err("LIST_FAILED", e?.message || "list failed"));
    }
  });

  r.post("/api/files/create", async (req: Request, res: Response) => {
    const { path: p, content = "", type = "file" } = (req.body || {}) as {
      path?: string;
      content?: string;
      type?: "file" | "folder";
    };
    if (!p) return res.status(400).json(err("BAD_REQUEST", "path required"));
    try {
      const projectId = await resolveProjectId(req);
      const abs = resolveInSandbox(projectId, p);
      if (type === "folder") {
        await fs.mkdir(abs, { recursive: true });
      } else {
        await fs.mkdir(path.dirname(abs), { recursive: true });
        await fs.writeFile(abs, content, "utf-8");
      }
      bus.emit("file.change", { projectId, path: p, kind: "add", ts: Date.now() });
      res.json({ ok: true, data: { path: p, type } });
    } catch (e: any) {
      res.status(500).json(err("CREATE_FAILED", e?.message || "create failed"));
    }
  });

  r.post("/api/files/upload", upload.array("files"), async (req: Request, res: Response) => {
    try {
      const projectId = await resolveProjectId(req);
      await ensureProjectDir(projectId);
      const targetDir = ((req.body?.path as string) || "").replace(/^[/\\]+/, "");
      const baseAbs = resolveInSandbox(projectId, targetDir || ".");
      await fs.mkdir(baseAbs, { recursive: true });
      const files = (req.files as Express.Multer.File[]) || [];
      const written: Array<{ path: string; bytes: number }> = [];
      for (const f of files) {
        const safeName = path.basename(f.originalname).replace(/[\x00-\x1f]/g, "_");
        const relPath = path.posix.join(targetDir || ".", safeName);
        const abs = resolveInSandbox(projectId, relPath);
        await fs.mkdir(path.dirname(abs), { recursive: true });
        await fs.writeFile(abs, f.buffer);
        bus.emit("file.change", { projectId, path: relPath, kind: "add", ts: Date.now() });
        written.push({ path: relPath, bytes: f.size });
      }
      res.json({
        ok: true,
        uploaded: written.length,
        files: written,
        data: { uploaded: written.length, files: written },
      });
    } catch (e: any) {
      res.status(500).json(err("UPLOAD_FAILED", e?.message || "upload failed"));
    }
  });

  r.get("/api/files/download", async (req: Request, res: Response) => {
    const p = (req.query.path as string) || "";
    if (!p) return res.status(400).json(err("BAD_REQUEST", "path query required"));
    try {
      const projectId = await resolveProjectId(req);
      const abs = resolveInSandbox(projectId, p);
      res.download(abs);
    } catch (e: any) {
      res.status(404).json(err("DOWNLOAD_FAILED", e?.message || "download failed"));
    }
  });

  r.delete("/api/files/:path(*)", async (req: Request, res: Response) => {
    const p = decodeURIComponent(req.params.path || "");
    if (!p) return res.status(400).json(err("BAD_REQUEST", "path required"));
    try {
      const projectId = await resolveProjectId(req);
      const abs = resolveInSandbox(projectId, p);
      await fs.rm(abs, { recursive: true, force: true });
      bus.emit("file.change", { projectId, path: p, kind: "unlink", ts: Date.now() });
      res.json({ ok: true, data: { path: p, deleted: true } });
    } catch (e: any) {
      res.status(500).json(err("DELETE_FAILED", e?.message || "delete failed"));
    }
  });
}
