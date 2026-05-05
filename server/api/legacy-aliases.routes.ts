import { Router, type Request, type Response } from "express";
import fs from "fs/promises";
import path from "path";
import { db } from "../infrastructure/db/index.ts";
import { diffQueue } from "../../shared/schema.ts";
import { eq, desc, and } from "drizzle-orm";
import { resolveProjectId } from "../orchestration/active-project.ts";
import { orchestrator } from "../orchestration/controller.ts";
import { llm } from "../llm/openrouter.client.ts";
import { bus } from "../infrastructure/events/bus.ts";
import { resolveInSandbox } from "../infrastructure/sandbox/sandbox.util.ts";

export function createLegacyAliasRouter(): Router {
  const r = Router();

  r.get("/api/preview-state", async (req: Request, res: Response) => {
    const projectId = await resolveProjectId(req);
    res.json({ ok: true, data: { projectId, status: "stopped" } });
  });

  r.post("/api/preview-state", async (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  const planHandler = async (req: Request, res: Response) => {
    const { prompt, goal } = (req.body || {}) as { prompt?: string; goal?: string };
    const text = prompt || goal;
    if (!text) {
      return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "prompt or goal required" } });
    }
    try {
      const result = await llm.chat(
        [
          {
            role: "system",
            content:
              "You are a senior planner. Return STRICT JSON: {plan: [{step:string, rationale:string}]}.",
          },
          { role: "user", content: text },
        ],
        { temperature: 0.2, maxTokens: 800 },
      );
      let parsed: any = { plan: [] };
      try {
        const s = result.content.indexOf("{");
        const e = result.content.lastIndexOf("}");
        if (s >= 0 && e > s) parsed = JSON.parse(result.content.slice(s, e + 1));
      } catch {}
      res.json({ ok: true, data: { ...parsed, raw: result.content } });
    } catch (e: any) {
      res.json({
        ok: true,
        data: {
          plan: [{ step: "Generate code from prompt", rationale: text }],
          note: "LLM unavailable, returning fallback plan",
          error: e.message,
        },
      });
    }
  };
  r.post("/api/planning/generate", planHandler);
  r.post("/api/agent/plan", planHandler);

  r.post("/api/fs/conflict-check", (_req: Request, res: Response) => {
    res.json({ ok: true, data: { conflict: false, conflicts: [] } });
  });
  r.post("/api/fs/conflict-details", (_req: Request, res: Response) => {
    res.json({ ok: true, data: { conflict: false, details: null } });
  });

  r.post("/api/agent/run/create", async (req: Request, res: Response) => {
    const { idea } = (req.body || {}) as { idea?: string };
    if (!idea) {
      return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "idea required" } });
    }
    const projectId = await resolveProjectId(req);
    const handle = await orchestrator.runGoal({ projectId, goal: idea });
    res.json({ ok: true, data: { id: handle.runId, projectId, ...handle } });
  });

  const ultraStates = new Map<string, "created" | "running" | "paused" | "stopped">();

  r.post("/api/agent/run/start", (req: Request, res: Response) => {
    const { id } = (req.body || {}) as { id?: string };
    if (id) ultraStates.set(id, "running");
    res.json({ ok: true, data: { id, status: "running" } });
  });
  r.post("/api/agent/run/pause", (req: Request, res: Response) => {
    const { id } = (req.body || {}) as { id?: string };
    if (id) ultraStates.set(id, "paused");
    res.json({ ok: true, data: { id, status: "paused" } });
  });
  r.post("/api/agent/run/resume", (req: Request, res: Response) => {
    const { id } = (req.body || {}) as { id?: string };
    if (id) ultraStates.set(id, "running");
    res.json({ ok: true, data: { id, status: "running" } });
  });
  r.post("/api/agent/run/hard-stop", (req: Request, res: Response) => {
    const { id } = (req.body || {}) as { id?: string };
    if (id) {
      orchestrator.cancel(id);
      ultraStates.set(id, "stopped");
    }
    res.json({ ok: true, data: { id, status: "stopped" } });
  });

  r.post("/api/run/create", async (req: Request, res: Response) => {
    const { idea } = (req.body || {}) as { idea?: string };
    if (!idea) {
      return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "idea required" } });
    }
    const projectId = await resolveProjectId(req);
    const handle = await orchestrator.runGoal({ projectId, goal: idea });
    res.json({ ok: true, data: { id: handle.runId, projectId, ...handle } });
  });
  r.post("/api/run/start", (req, res) => res.json({ ok: true, data: { id: req.body?.id, status: "running" } }));
  r.post("/api/run/pause", (req, res) => res.json({ ok: true, data: { id: req.body?.id, status: "paused" } }));
  r.post("/api/run/resume", (req, res) => res.json({ ok: true, data: { id: req.body?.id, status: "running" } }));
  r.post("/api/run/hard-stop", (req, res) => {
    if (req.body?.id) orchestrator.cancel(req.body.id);
    res.json({ ok: true, data: { id: req.body?.id, status: "stopped" } });
  });

  r.get("/api/file/history", async (req: Request, res: Response) => {
    try {
      const projectId = await resolveProjectId(req);
      const filePath = (req.query.filePath as string) || "";
      const rows = await db
        .select()
        .from(diffQueue)
        .where(
          filePath
            ? and(eq(diffQueue.projectId, projectId), eq(diffQueue.filePath, filePath))
            : eq(diffQueue.projectId, projectId),
        )
        .orderBy(desc(diffQueue.createdAt));
      const history = rows.map((row) => ({
        versionId: String(row.id),
        path: row.filePath,
        status: row.status,
        createdAt: row.createdAt,
      }));
      res.json({ ok: true, data: { history }, history });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: { code: "HISTORY_FAILED", message: e?.message } });
    }
  });

  r.post("/api/file/undo", async (req: Request, res: Response) => {
    const { filePath } = (req.body || {}) as { filePath?: string };
    if (!filePath) {
      return res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "filePath required" } });
    }
    try {
      const projectId = await resolveProjectId(req);
      const rows = await db
        .select()
        .from(diffQueue)
        .where(and(eq(diffQueue.projectId, projectId), eq(diffQueue.filePath, filePath)))
        .orderBy(desc(diffQueue.createdAt))
        .limit(5);
      const last = rows.find((r) => r.status === "applied") || rows[0];
      if (!last) {
        return res.json({ ok: true, data: { undone: false, reason: "no history" } });
      }
      const restore = last.oldContent ?? "";
      const abs = resolveInSandbox(projectId, filePath);
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, restore, "utf-8");
      await db.update(diffQueue).set({ status: "rejected" }).where(eq(diffQueue.id, last.id));
      bus.emit("file.change", { projectId, path: filePath, kind: "change", ts: Date.now() });
      res.json({ ok: true, data: { undone: true, versionId: String(last.id), path: filePath } });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: { code: "UNDO_FAILED", message: e?.message } });
    }
  });

  r.post("/api/file/conflict-check", async (req: Request, res: Response) => {
    const { filePath, baseVersionId } = (req.body || {}) as {
      filePath?: string;
      baseVersionId?: string | number;
    };
    if (!filePath) {
      return res.json({ ok: true, data: { conflict: false } });
    }
    try {
      const projectId = await resolveProjectId(req);
      const rows = await db
        .select()
        .from(diffQueue)
        .where(and(eq(diffQueue.projectId, projectId), eq(diffQueue.filePath, filePath)))
        .orderBy(desc(diffQueue.createdAt))
        .limit(1);
      const latest = rows[0];
      const conflict =
        !!latest && baseVersionId !== undefined && String(latest.id) !== String(baseVersionId);
      res.json({
        ok: true,
        data: {
          conflict,
          latestVersionId: latest ? String(latest.id) : null,
          baseVersionId: baseVersionId ?? null,
        },
      });
    } catch (e: any) {
      res.json({ ok: true, data: { conflict: false, error: e?.message } });
    }
  });

  return r;
}
