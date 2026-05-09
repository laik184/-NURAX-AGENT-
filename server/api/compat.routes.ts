import { Router, type Request, type Response } from "express";

export function createCompatRouter(): Router {
  const router = Router();

  router.get("/api/v1/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", version: "1.0.0", ts: new Date().toISOString() });
  });

  router.get("/api/v1/tools", (_req: Request, res: Response) => {
    res.redirect(301, "/api/inventory/tools");
  });

  router.get("/api/v1/projects", (_req: Request, res: Response) => {
    res.redirect(301, "/api/projects");
  });

  router.post("/api/v1/run", (_req: Request, res: Response) => {
    res.redirect(307, "/api/run");
  });

  return router;
}
