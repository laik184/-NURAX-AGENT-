import { Router, type Request, type Response } from "express";
import { db } from "../infrastructure/db/index.ts";
import { agentRuns, agentEvents } from "../../shared/schema.ts";
import { eq, desc } from "drizzle-orm";
import { runManager as orchestrator } from "../chat/run/controller.ts";

function llmPreflight(): string | null {
  if (!process.env.OPENROUTER_API_KEY) {
    return "OPENROUTER_API_KEY is not set. Add it in Replit Secrets to enable agent runs.";
  }
  return null;
}

export function createRunRouter(): Router {
  const r = Router();

  r.post("/", async (req: Request, res: Response) => {
    const preflightError = llmPreflight();
    if (preflightError) {
      return res.status(503).json({
        ok: false,
        error: { code: "LLM_UNAVAILABLE", message: preflightError },
      });
    }

    const { projectId, goal, mode, context, systemPrompt } = (req.body || {}) as {
      projectId?: number;
      goal?: string;
      mode?: "lite" | "economy" | "power" | "core";
      context?: Record<string, unknown>;
      systemPrompt?: string;
    };
    if (!projectId || !goal) {
      return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "projectId and goal required" } });
    }
    try {
      const handle = await orchestrator.runGoal({ projectId, goal, mode, context, systemPrompt });
      res.json({ ok: true, data: handle });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: { code: "RUN_ERROR", message: e.message } });
    }
  });

  r.get("/:runId", async (req: Request, res: Response) => {
    const runId = req.params.runId;
    const [run] = await db.select().from(agentRuns).where(eq(agentRuns.id, runId));
    if (!run) return res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "run" } });
    const events = await db
      .select()
      .from(agentEvents)
      .where(eq(agentEvents.runId, runId))
      .orderBy(desc(agentEvents.ts))
      .limit(200);
    res.json({ ok: true, data: { run, events } });
  });

  r.post("/:runId/cancel", (req: Request, res: Response) => {
    const ok = orchestrator.cancel(req.params.runId);
    res.json({ ok, data: { runId: req.params.runId, cancelled: ok } });
  });

  return r;
}
