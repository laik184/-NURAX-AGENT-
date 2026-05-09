import { Router, type Request, type Response } from "express";

export function createLegacyAliasRouter(): Router {
  const router = Router();

  router.get("/api/agent/runs", (_req: Request, res: Response) => {
    res.redirect(301, "/api/agents");
  });

  router.post("/api/agent/run", (req: Request, res: Response) => {
    res.redirect(307, "/api/run");
  });

  router.get("/api/agent/run/:runId", (req: Request, res: Response) => {
    res.redirect(301, `/api/run/${req.params.runId}`);
  });

  router.get("/api/project", (_req: Request, res: Response) => {
    res.redirect(301, "/api/projects");
  });

  return router;
}
