import { Router, type Request, type Response } from "express";

const folders: Array<{ id: number; name: string; projectIds: number[]; createdAt: string }> = [];
let nextId = 1;

export function createFoldersRouter(): Router {
  const router = Router();

  router.get("/", (_req: Request, res: Response) => {
    res.json({ ok: true, folders });
  });

  router.post("/", (req: Request, res: Response) => {
    const { name, projectIds } = req.body;
    if (!name) return res.status(400).json({ ok: false, error: "name is required" });
    const folder = { id: nextId++, name, projectIds: projectIds || [], createdAt: new Date().toISOString() };
    folders.push(folder);
    res.status(201).json({ ok: true, folder });
  });

  router.patch("/:id", (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const folder = folders.find((f) => f.id === id);
    if (!folder) return res.status(404).json({ ok: false, error: "Folder not found" });
    if (req.body.name) folder.name = req.body.name;
    if (req.body.projectIds) folder.projectIds = req.body.projectIds;
    res.json({ ok: true, folder });
  });

  router.delete("/:id", (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const idx = folders.findIndex((f) => f.id === id);
    if (idx === -1) return res.status(404).json({ ok: false, error: "Folder not found" });
    folders.splice(idx, 1);
    res.json({ ok: true, deleted: true });
  });

  return router;
}
