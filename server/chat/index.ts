import { Router } from "express";
import { resolveQuestion }        from "../orchestration/question-bus.ts";
import { createChatHistoryRouter } from "./history.routes.ts";
import { createChatPromptsRouter } from "./prompts.routes.ts";
import { createChatMessagesRouter } from "./messages.routes.ts";
import { createChatFeedbackRouter } from "./feedback.routes.ts";
import { createChatUploadRouter }  from "./upload.routes.ts";
import { createChatStreamRouter }  from "./stream.routes.ts";

export function createChatRouter(): Router {
  const router = Router();

  router.use("/", createChatHistoryRouter());
  router.use("/", createChatPromptsRouter());
  router.use("/", createChatMessagesRouter());
  router.use("/", createChatFeedbackRouter());
  router.use("/", createChatUploadRouter());
  router.use("/", createChatStreamRouter());

  router.post("/answer", (req, res) => {
    const { runId, questionId, answer } = req.body ?? {};
    if (!runId || !questionId || !answer) {
      return res.status(400).json({
        ok:    false,
        error: "runId, questionId, and answer are required",
      });
    }
    const resolved = resolveQuestion(String(runId), String(questionId), String(answer));
    if (!resolved) {
      return res.status(404).json({
        ok:    false,
        error: "No pending question found for this runId/questionId",
      });
    }
    res.json({ ok: true, answer });
  });

  return router;
}
