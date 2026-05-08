import { Router } from "express";
import { db } from "../../infrastructure/db/index.ts";
import { chatMessages } from "../../../shared/schema.ts";
import { eq, and } from "drizzle-orm";

const VALID_ROLES = new Set(["user", "agent", "system", "tool"]);

export function createChatMessagesRouter(): Router {
  const router = Router();

  router.post("/messages", async (req, res) => {
    const { projectId, runId, role, content, tokensUsed, toolCalls } = req.body ?? {};
    if (!projectId || !role || !content) {
      return res.status(400).json({ ok: false, error: "projectId, role, content are required" });
    }
    if (!VALID_ROLES.has(String(role))) {
      return res.status(400).json({ ok: false, error: `role must be one of: ${[...VALID_ROLES].join(", ")}` });
    }
    try {
      const [inserted] = await db
        .insert(chatMessages)
        .values({
          projectId:  Number(projectId),
          runId:      runId ? String(runId) : null,
          role:       String(role),
          content:    String(content),
          tokensUsed: tokensUsed ? Number(tokensUsed) : null,
          toolCalls:  toolCalls ?? null,
        })
        .returning();
      res.status(201).json({ ok: true, message: inserted });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e?.message ?? String(e) });
    }
  });

  router.get("/messages", async (req, res) => {
    const projectId = Number(req.query.projectId) || 0;
    const runId     = req.query.runId ? String(req.query.runId) : null;
    const limit     = Math.min(Number(req.query.limit) || 200, 500);
    if (!projectId) return res.status(400).json({ ok: false, error: "projectId is required" });
    try {
      const condition = runId
        ? and(eq(chatMessages.projectId, projectId), eq(chatMessages.runId, runId))
        : eq(chatMessages.projectId, projectId);
      const msgs = await db
        .select()
        .from(chatMessages)
        .where(condition)
        .orderBy(chatMessages.createdAt)
        .limit(limit);
      res.json({ ok: true, messages: msgs, count: msgs.length });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e?.message ?? String(e) });
    }
  });

  router.delete("/messages/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!id || isNaN(id)) return res.status(400).json({ ok: false, error: "valid message id required" });
    try {
      const [deleted] = await db.delete(chatMessages).where(eq(chatMessages.id, id)).returning();
      if (!deleted) return res.status(404).json({ ok: false, error: "message not found" });
      res.json({ ok: true, deleted: true, id });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e?.message ?? String(e) });
    }
  });

  return router;
}
