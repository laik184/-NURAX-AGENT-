import { Router, type Request, type Response } from "express";
import fs from "fs/promises";
import path from "path";
import { ensureProjectDir, resolveInSandbox, projectRoot } from "../infrastructure/sandbox/sandbox.util.ts";
import { bus } from "../infrastructure/events/bus.ts";

interface TreeNode {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: TreeNode[];
}

async function buildTree(absRoot: string, relRoot = ""): Promise<TreeNode[]> {
  let entries: import("fs").Dirent[];
  try {
    entries = await fs.readdir(absRoot, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: TreeNode[] = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith(".")) continue;
    const rel = relRoot ? `${relRoot}/${entry.name}` : entry.name;
    const abs = path.join(absRoot, entry.name);
    if (entry.isDirectory()) {
      out.push({
        name: entry.name,
        path: rel,
        type: "dir",
        children: await buildTree(abs, rel),
      });
    } else if (entry.isFile()) {
      out.push({ name: entry.name, path: rel, type: "file" });
    }
  }
  return out;
}

function getProjectId(req: Request): number | null {
  const raw = (req.query.projectId ?? req.body?.projectId) as string | number | undefined;
  if (raw === undefined || raw === null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function createFsRouter(): Router {
  const r = Router();

  r.get("/tree", async (req: Request, res: Response) => {
    const projectId = getProjectId(req);
    if (projectId == null) {
      return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "projectId required" } });
    }
    try {
      await ensureProjectDir(projectId);
      const tree = await buildTree(projectRoot(projectId));
      res.json({ ok: true, data: tree });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: { code: "FS_ERROR", message: e.message } });
    }
  });

  r.get("/file", async (req: Request, res: Response) => {
    const projectId = getProjectId(req);
    const filePath = req.query.path as string;
    if (projectId == null || !filePath) {
      return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "projectId and path required" } });
    }
    try {
      const abs = resolveInSandbox(projectId, filePath);
      const content = await fs.readFile(abs, "utf-8");
      res.json({ ok: true, data: { path: filePath, content } });
    } catch (e: any) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: e.message } });
    }
  });

  r.post("/file", async (req: Request, res: Response) => {
    const { projectId, path: filePath, content } = (req.body || {}) as {
      projectId?: number;
      path?: string;
      content?: string;
    };
    if (!projectId || !filePath || content === undefined) {
      return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "projectId, path, content required" } });
    }
    try {
      const abs = resolveInSandbox(projectId, filePath);
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, content, "utf-8");
      bus.emit("file.change", { projectId, path: filePath, kind: "change", ts: Date.now() });
      res.json({ ok: true, data: { path: filePath, bytes: content.length } });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: { code: "FS_ERROR", message: e.message } });
    }
  });

  return r;
}
