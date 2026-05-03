import { Router, type Request, type Response } from "express";
import { resolveProjectId } from "../../orchestration/active-project.ts";
import { orchestrator } from "../../orchestration/controller.ts";
import { err } from "./_shared.ts";

export function registerWebGenerateRoutes(r: Router): void {
  r.post("/api/web/generate/page", async (req: Request, res: Response) => {
    const { name, type } = (req.body || {}) as { name?: string; type?: string };
    if (!name) return res.status(400).json(err("BAD_REQUEST", "name required"));
    try {
      const projectId = await resolveProjectId(req);
      const goal = `Generate a web ${type || "page"} component named "${name}".`;
      const handle = await orchestrator.runGoal({ projectId, goal });
      res.json({ ok: true, data: { runId: handle.runId, projectId, kind: "page", name, type } });
    } catch (e: any) {
      res.status(500).json(err("GEN_FAILED", e?.message || "page generation failed"));
    }
  });

  r.post("/api/web/generate/fullapp", async (req: Request, res: Response) => {
    const { intent } = (req.body || {}) as { intent?: string };
    if (!intent) return res.status(400).json(err("BAD_REQUEST", "intent required"));
    try {
      const projectId = await resolveProjectId(req);
      const handle = await orchestrator.runGoal({
        projectId,
        goal: `Generate a full web application based on this intent: ${intent}`,
      });
      res.json({ ok: true, data: { runId: handle.runId, projectId, kind: "fullapp", intent } });
    } catch (e: any) {
      res.status(500).json(err("GEN_FAILED", e?.message || "fullapp generation failed"));
    }
  });
}
