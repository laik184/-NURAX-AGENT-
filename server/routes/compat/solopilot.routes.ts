import { Router, type Request, type Response } from "express";
import fs from "fs/promises";
import path from "path";
import { eq, desc } from "drizzle-orm";
import { db } from "../../db/index.ts";
import { diffQueue, agentEvents } from "../../../shared/schema.ts";
import { resolveProjectId } from "../../orchestration/active-project.ts";
import { resolveInSandbox } from "../../sandbox/sandbox.util.ts";
import { bus } from "../../events/bus.ts";
import { llm } from "../../llm/openrouter.client.ts";
import { orchestrator } from "../../orchestration/controller.ts";
import { err } from "./_shared.ts";

export function registerSolopilotRoutes(r: Router): void {
  r.post("/api/solopilot/execute", async (req: Request, res: Response) => {
    const { plan, command, intent } = (req.body || {}) as {
      plan?: unknown;
      command?: string;
      intent?: string;
    };
    try {
      const projectId = await resolveProjectId(req);
      const goal =
        typeof plan === "string"
          ? plan
          : Array.isArray((plan as any)?.plan)
          ? (plan as any).plan.map((s: any) => s.step || s).join("\n")
          : intent || command || JSON.stringify(plan ?? {});
      const handle = await orchestrator.runGoal({ projectId, goal });
      res.json({ ok: true, data: { runId: handle.runId, projectId, goal } });
    } catch (e: any) {
      res.status(500).json(err("EXECUTE_FAILED", e?.message || "execute failed"));
    }
  });

  r.post("/api/solopilot/plan", async (req: Request, res: Response) => {
    const { intent } = (req.body || {}) as { intent?: string };
    if (!intent) return res.status(400).json(err("BAD_REQUEST", "intent required"));
    try {
      const result = await llm.chat(
        [
          { role: "system", content: "Return JSON: {plan:[{step,rationale}]}" },
          { role: "user", content: intent },
        ],
        { temperature: 0.2, maxTokens: 600 },
      );
      let parsed: any = { plan: [] };
      try {
        const s = result.content.indexOf("{");
        const e = result.content.lastIndexOf("}");
        if (s >= 0 && e > s) parsed = JSON.parse(result.content.slice(s, e + 1));
      } catch {}
      res.json({ ok: true, data: parsed });
    } catch (e: any) {
      res.json({
        ok: true,
        data: {
          plan: [{ step: "Implement intent", rationale: intent }],
          note: "LLM unavailable",
          error: e?.message,
        },
      });
    }
  });

  r.post("/api/solopilot/applyPatch", async (req: Request, res: Response) => {
    const { patchId, patch } = (req.body || {}) as { patchId?: string | number; patch?: any };
    if (patchId === undefined && !patch) {
      return res.status(400).json(err("BAD_REQUEST", "patchId or patch required"));
    }
    try {
      const projectId = await resolveProjectId(req);
      let target = patch;
      if (!target && patchId !== undefined) {
        const [row] = await db.select().from(diffQueue).where(eq(diffQueue.id, Number(patchId)));
        target = row;
      }
      if (!target?.filePath && !target?.path) {
        return res.status(404).json(err("NOT_FOUND", "patch not found"));
      }
      const filePath = target.filePath || target.path;
      const content = target.newContent ?? target.content ?? "";
      const abs = resolveInSandbox(projectId, filePath);
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, content, "utf-8");
      if (patchId !== undefined) {
        await db.update(diffQueue).set({ status: "applied" }).where(eq(diffQueue.id, Number(patchId)));
      }
      bus.emit("file.change", { projectId, path: filePath, kind: "change", ts: Date.now() });
      res.json({ ok: true, data: { applied: true, path: filePath } });
    } catch (e: any) {
      res.status(500).json(err("APPLY_FAILED", e?.message || "apply failed"));
    }
  });

  r.post("/api/solopilot/rejectPatch", async (req: Request, res: Response) => {
    const { patchId } = (req.body || {}) as { patchId?: string | number };
    if (patchId !== undefined) {
      try {
        await db.update(diffQueue).set({ status: "rejected" }).where(eq(diffQueue.id, Number(patchId)));
      } catch {}
    }
    res.json({ ok: true, data: { rejected: true, patchId } });
  });

  r.post("/api/solopilot/prepareConflict", (_req: Request, res: Response) => {
    res.json({ ok: true, data: { conflict: false, blocks: [] } });
  });

  r.post("/api/solopilot/aiResolve", async (req: Request, res: Response) => {
    const { conflict } = (req.body || {}) as { conflict?: any };
    try {
      const result = await llm.chat(
        [
          { role: "system", content: "Resolve the merge conflict. Return only the merged code." },
          { role: "user", content: JSON.stringify(conflict ?? {}) },
        ],
        { temperature: 0.1, maxTokens: 1200 },
      );
      res.json({ ok: true, data: { resolved: result.content }, resolved: result.content });
    } catch (e: any) {
      res.json({ ok: false, error: { code: "LLM_FAILED", message: e?.message || "LLM failed" } });
    }
  });

  r.post("/api/solopilot/aiMerge", async (req: Request, res: Response) => {
    const { conflict } = (req.body || {}) as { conflict?: any };
    try {
      const result = await llm.chat(
        [
          { role: "system", content: "Merge this conflict block. Return only merged code." },
          { role: "user", content: JSON.stringify(conflict ?? {}) },
        ],
        { temperature: 0.1, maxTokens: 1200 },
      );
      res.json({ ok: true, merged: result.content, data: { merged: result.content } });
    } catch (e: any) {
      res.json({ ok: false, error: { code: "LLM_FAILED", message: e?.message || "LLM failed" } });
    }
  });

  r.post("/api/solopilot/resolveConflictApply", async (req: Request, res: Response) => {
    const { path: filePath, mergedContent } = (req.body || {}) as {
      path?: string;
      mergedContent?: string;
    };
    if (!filePath || mergedContent === undefined) {
      return res.status(400).json(err("BAD_REQUEST", "path and mergedContent required"));
    }
    try {
      const projectId = await resolveProjectId(req);
      const abs = resolveInSandbox(projectId, filePath);
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, mergedContent, "utf-8");
      bus.emit("file.change", { projectId, path: filePath, kind: "change", ts: Date.now() });
      res.json({ ok: true, data: { path: filePath, applied: true } });
    } catch (e: any) {
      res.json({ ok: false, error: { code: "APPLY_FAILED", message: e?.message } });
    }
  });

  r.post("/api/solopilot/architecture", async (req: Request, res: Response) => {
    const { goal = "Describe project architecture" } = (req.body || {}) as { goal?: string };
    res.json({
      ok: true,
      data: {
        goal,
        architecture: {
          frontend: "React + Vite",
          backend: "Express + Drizzle (Postgres)",
          realtime: "WS + SSE",
          orchestration: "OrchestrationController → executePipeline → agents",
        },
      },
    });
  });

  r.post("/api/solopilot/applyChange", async (req: Request, res: Response) => {
    const { path: filePath, content } = (req.body || {}) as { path?: string; content?: string };
    if (!filePath || content === undefined) {
      return res.status(400).json(err("BAD_REQUEST", "path and content required"));
    }
    try {
      const projectId = await resolveProjectId(req);
      const abs = resolveInSandbox(projectId, filePath);
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, content, "utf-8");
      bus.emit("file.change", { projectId, path: filePath, kind: "change", ts: Date.now() });
      res.json({ ok: true, data: { path: filePath, applied: true } });
    } catch (e: any) {
      res.status(500).json(err("APPLY_FAILED", e?.message || "apply failed"));
    }
  });

  r.post("/api/solopilot/autoevolve", async (req: Request, res: Response) => {
    const { goal = "Evolve the architecture" } = (req.body || {}) as { goal?: string };
    try {
      const projectId = await resolveProjectId(req);
      const handle = await orchestrator.runGoal({ projectId, goal });
      res.json({ ok: true, data: { runId: handle.runId, projectId, goal } });
    } catch (e: any) {
      res.status(500).json(err("AUTOEVOLVE_FAILED", e?.message || "autoevolve failed"));
    }
  });

  r.get("/api/solopilot/dashboard/history", async (req: Request, res: Response) => {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    try {
      const rows = await db.select().from(agentEvents).orderBy(desc(agentEvents.ts)).limit(limit);
      res.json({ ok: true, history: rows, data: { history: rows } });
    } catch (e: any) {
      res.json({
        ok: true,
        history: [],
        data: { history: [] },
        error: { code: "HISTORY_EMPTY", message: e?.message },
      });
    }
  });
}
