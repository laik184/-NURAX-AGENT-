/**
 * ChatOrchestrator — Central controller for all chat functionality.
 *
 * Architecture:
 *   RunManager → Orchestrator → Routes / Streams / Events
 *
 * The run layer (server/chat/run/) manages agent run lifecycle.
 * The orchestrator wires together all sub-systems and exposes a single
 * surface that main.ts interacts with.
 */

import { Router } from "express";
import type { Server as HttpServer } from "http";

import { createChatHistoryRouter }   from "./routes/history.routes.ts";
import { createChatPromptsRouter }   from "./routes/prompts.routes.ts";
import { createChatMessagesRouter }  from "./routes/messages.routes.ts";
import { createChatFeedbackRouter }  from "./routes/feedback.routes.ts";
import { createChatUploadRouter }    from "./routes/upload.routes.ts";
import { createChatStreamRouter }    from "./routes/stream.routes.ts";

import { createSseRouter }           from "./streams/sse.ts";
import { attachWebSocketServer }     from "./streams/ws-server.ts";
import { startConsoleLogPersister }  from "./events/console-log-persister.ts";

import { runManager }                from "./run/controller.ts";
import { resolveQuestion }           from "./run/question-bus.ts";

class ChatOrchestrator {
  /**
   * The run manager controls agent run lifecycle.
   * Entry point for starting, cancelling, and tracking runs.
   */
  get run() {
    return runManager;
  }

  /**
   * Build the Express router for all /api/chat/* endpoints.
   * Controlled by the orchestrator — adds routes for HTTP chat operations.
   */
  buildChatRouter(): Router {
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
        return res.status(400).json({ ok: false, error: "runId, questionId, and answer are required" });
      }
      const resolved = resolveQuestion(String(runId), String(questionId), String(answer));
      if (!resolved) {
        return res.status(404).json({ ok: false, error: "No pending question found for this runId/questionId" });
      }
      res.json({ ok: true, answer });
    });

    return router;
  }

  /**
   * Build the Express router for all SSE stream endpoints.
   * Controlled by the orchestrator — provides real-time agent event streams.
   */
  buildSseRouter(): Router {
    return createSseRouter();
  }

  /**
   * Attach WebSocket server to the HTTP server.
   * Controlled by the orchestrator — provides real-time WS channels.
   */
  attachWebSocket(server: HttpServer): void {
    attachWebSocketServer(server);
  }

  /**
   * Start background event persistence services.
   * Controlled by the orchestrator — persists console logs to DB.
   */
  startPersistence(): void {
    startConsoleLogPersister();
  }
}

export const chatOrchestrator = new ChatOrchestrator();
