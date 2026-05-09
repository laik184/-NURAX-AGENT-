import { Router, type Request, type Response } from "express";
import { getProjectPort } from "../infrastructure/proxy/preview-proxy.ts";

export function createPreviewRouter(): Router {
  const router = Router();

  router.get("/url/:projectId", (req: Request, res: Response) => {
    const projectId = Number(req.params.projectId);
    const port = getProjectPort(projectId);
    if (!port) {
      return res.status(503).json({
        ok: false,
        error: "No running server for this project. Start the dev server first.",
      });
    }
    const url = process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : `http://localhost:${port}`;
    res.json({ ok: true, url, port, projectId });
  });

  router.get("/status/:projectId", (req: Request, res: Response) => {
    const projectId = Number(req.params.projectId);
    const port = getProjectPort(projectId);
    res.json({
      ok: true,
      projectId,
      running: !!port,
      port: port || null,
    });
  });

  return router;
}
