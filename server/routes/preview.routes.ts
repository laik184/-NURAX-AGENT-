import { Router, type Request, type Response } from "express";

interface PreviewState {
  projectId: number;
  status: "stopped" | "starting" | "running" | "error";
  url?: string;
  startedAt?: number;
}

const previews = new Map<number, PreviewState>();

export function createPreviewRouter(): Router {
  const r = Router();

  r.get("/status", (req: Request, res: Response) => {
    const projectId = Number(req.query.projectId);
    if (!Number.isFinite(projectId)) {
      return res.json({ ok: true, data: { status: "stopped" } });
    }
    const state = previews.get(projectId) || { projectId, status: "stopped" as const };
    res.json({ ok: true, data: state });
  });

  r.post("/start", (req: Request, res: Response) => {
    const { projectId } = (req.body || {}) as { projectId?: number };
    if (!projectId) {
      return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "projectId required" } });
    }
    previews.set(projectId, {
      projectId,
      status: "running",
      url: `/sandbox/${projectId}`,
      startedAt: Date.now(),
    });
    res.json({ ok: true, data: previews.get(projectId) });
  });

  r.post("/stop", (req: Request, res: Response) => {
    const { projectId } = (req.body || {}) as { projectId?: number };
    if (!projectId) {
      return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "projectId required" } });
    }
    previews.set(projectId, { projectId, status: "stopped" });
    res.json({ ok: true, data: previews.get(projectId) });
  });

  return r;
}
