import { Router, type Request, type Response } from "express";
import { chatOrchestrator } from "../chat/index.ts";

export function createRunRouter(): Router {
  const router = Router();

  router.post("/", async (req: Request, res: Response) => {
    try {
      const { projectId, goal, mode, context, systemPrompt } = req.body;
      if (!projectId) return res.status(400).json({ ok: false, error: "projectId is required" });
      if (!goal) return res.status(400).json({ ok: false, error: "goal is required" });

      const handle = await chatOrchestrator.run.runGoal({
        projectId: Number(projectId),
        goal: String(goal),
        mode: mode || "agent",
        context: context || {},
        systemPrompt,
      });

      res.status(202).json({ ok: true, runId: handle.runId, status: handle.status });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.get("/:runId", (req: Request, res: Response) => {
    const handle = chatOrchestrator.run.get(req.params.runId);
    if (!handle) return res.status(404).json({ ok: false, error: "Run not found" });
    res.json({ ok: true, run: handle });
  });

  router.post("/:runId/cancel", (req: Request, res: Response) => {
    const cancelled = chatOrchestrator.run.cancel(req.params.runId);
    if (!cancelled) return res.status(404).json({ ok: false, error: "Run not found or already done" });
    res.json({ ok: true, cancelled: true, runId: req.params.runId });
  });

  router.get("/", (_req: Request, res: Response) => {
    const allRuns = [...chatOrchestrator.runRegistry.values()];
    res.json({ ok: true, runs: allRuns });
  });

  return router;
}
