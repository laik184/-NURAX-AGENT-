import { Router, type Request, type Response } from "express";

interface Folder {
  id: number;
  name: string;
  parentId: number | null;
  createdAt: number;
}

const folders = new Map<number, Folder>();
let nextId = 1;

export function createFoldersRouter(): Router {
  const r = Router();

  r.get("/", (_req: Request, res: Response) => {
    res.json({ ok: true, data: Array.from(folders.values()) });
  });

  r.post("/", (req: Request, res: Response) => {
    const { name, parentId } = (req.body || {}) as { name?: string; parentId?: number | null };
    if (!name) return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "name required" } });
    const folder: Folder = { id: nextId++, name, parentId: parentId ?? null, createdAt: Date.now() };
    folders.set(folder.id, folder);
    res.json({ ok: true, data: folder });
  });

  r.patch("/:id", (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const folder = folders.get(id);
    if (!folder) return res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "folder" } });
    const { name } = (req.body || {}) as { name?: string };
    if (name) folder.name = name;
    res.json({ ok: true, data: folder });
  });

  r.delete("/:id", (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const ok = folders.delete(id);
    res.json({ ok, data: { id } });
  });

  return r;
}
