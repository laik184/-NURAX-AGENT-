import { Router, type Request, type Response } from "express";
import { runtimeManager } from "../infrastructure/runtime/runtime-manager.ts";

export function createPreviewRouter(): Router {
  const router = Router();

  router.get("/url/:projectId", (req: Request, res: Response) => {
    const projectId = Number(req.params.projectId);
    const port = runtimeManager.getPort(projectId);
    if (!port) {
      return res.status(503).json({
        ok: false,
        error: "No running server for this project. Start the dev server first.",
      });
    }
    res.json({
      ok: true,
      url: runtimeManager.previewUrl(projectId, port),
      port,
      projectId,
    });
  });

  router.get("/status/:projectId", (req: Request, res: Response) => {
    const projectId = Number(req.params.projectId);
    const entry = runtimeManager.get(projectId);
    res.json({
      ok: true,
      projectId,
      running: runtimeManager.isRunning(projectId),
      status: entry?.status ?? "stopped",
      port: entry?.port ?? null,
    });
  });

  return router;
}
