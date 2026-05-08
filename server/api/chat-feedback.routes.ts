import { Router } from "express";
import { db } from "../infrastructure/db/index.ts";
import { chatMessages } from "../../shared/schema.ts";
import { eq } from "drizzle-orm";

const VALID_FEEDBACK = new Set(["thumbs_up", "thumbs_down"]);

export function createChatFeedbackRouter(): Router {
  const router = Router();

  router.post("/messages/:id/feedback", async (req, res) => {
    const id       = Number(req.params.id);
    const feedback = String(req.body?.feedback ?? "");

    if (!id || isNaN(id)) {
      return res.status(400).json({ ok: false, error: "valid message id required" });
    }
    if (!VALID_FEEDBACK.has(feedback)) {
      return res.status(400).json({
        ok:    false,
        error: `feedback must be: ${[...VALID_FEEDBACK].join(" | ")}`,
      });
    }

    try {
      const [updated] = await db
        .update(chatMessages)
        .set({ feedback })
        .where(eq(chatMessages.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ ok: false, error: "message not found" });
      }
      res.json({ ok: true, message: updated });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e?.message ?? String(e) });
    }
  });

  router.delete("/messages/:id/feedback", async (req, res) => {
    const id = Number(req.params.id);
    if (!id || isNaN(id)) {
      return res.status(400).json({ ok: false, error: "valid message id required" });
    }
    try {
      const [updated] = await db
        .update(chatMessages)
        .set({ feedback: null })
        .where(eq(chatMessages.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ ok: false, error: "message not found" });
      }
      res.json({ ok: true, cleared: true, id });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e?.message ?? String(e) });
    }
  });

  router.get("/messages/:id/feedback", async (req, res) => {
    const id = Number(req.params.id);
    if (!id || isNaN(id)) {
      return res.status(400).json({ ok: false, error: "valid message id required" });
    }
    try {
      const [msg] = await db
        .select({ id: chatMessages.id, feedback: chatMessages.feedback })
        .from(chatMessages)
        .where(eq(chatMessages.id, id))
        .limit(1);

      if (!msg) return res.status(404).json({ ok: false, error: "message not found" });
      res.json({ ok: true, id: msg.id, feedback: msg.feedback ?? null });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e?.message ?? String(e) });
    }
  });

  return router;
}
