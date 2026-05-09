import { Router, type Request, type Response } from "express";
import { chatOrchestrator } from "../chat/index.ts";

export function createIntentRouter(): Router {
  const router = Router();

  router.post("/classify", async (req: Request, res: Response) => {
    try {
      const { message, projectId } = req.body;
      if (!message) return res.status(400).json({ ok: false, error: "message is required" });

      const intents = [
        { intent: "build", keywords: ["build", "create", "make", "generate", "write", "add"] },
        { intent: "debug", keywords: ["fix", "debug", "error", "bug", "problem", "issue", "broken"] },
        { intent: "run", keywords: ["run", "start", "execute", "launch", "deploy"] },
        { intent: "explain", keywords: ["explain", "what", "how", "why", "describe", "tell me"] },
        { intent: "edit", keywords: ["edit", "change", "update", "modify", "refactor", "improve"] },
      ];

      const lower = message.toLowerCase();
      const matched = intents.find((i) => i.keywords.some((k) => lower.includes(k)));

      res.json({
        ok: true,
        intent: matched?.intent || "general",
        message,
        projectId,
        confidence: matched ? 0.8 : 0.4,
      });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  return router;
}
