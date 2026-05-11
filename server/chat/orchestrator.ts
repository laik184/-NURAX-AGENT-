/**
 * server/chat/orchestrator.ts
 *
 * ChatOrchestrator — Central connector for ALL server/chat/ subsystems.
 *
 * Architecture (single entry point — nothing outside server/chat/ should
 * import internals directly):
 *
 *   server/chat/
 *   ├── routes/      → buildChatRouter()
 *   ├── streams/     → buildSseRouter(), attachWebSocket()
 *   ├── events/      → startPersistence()
 *   ├── run/
 *   │   ├── controller.ts     → .run (RunController)
 *   │   ├── registry.ts       → .run.get(), .run.cancel()
 *   │   ├── active-project.ts → .project.resolveId(), .project.getActive()
 *   │   ├── question-bus.ts   → .questions.wait(), .questions.resolve(), .questions.pendingCount()
 *   │   ├── event-persist.ts  → started inside startPersistence()
 *   │   └── types.ts          → re-exported from index.ts
 *   └── index.ts     → public surface
 *
 * Generator agents are accessed via chatOrchestrator.generators which delegates
 * to server/agents/generator-orchestrator.ts (its proper home).
 */

import { Router } from "express";
import type { Server as HttpServer } from "http";
import type { Request, Response } from "express";

// ── Routes ──────────────────────────────────────────────────────────────────
import { createChatHistoryRouter }  from "./routes/history.routes.ts";
import { createChatPromptsRouter }  from "./routes/prompts.routes.ts";
import { createChatMessagesRouter } from "./routes/messages.routes.ts";
import { createChatFeedbackRouter } from "./routes/feedback.routes.ts";
import { createChatUploadRouter }   from "./routes/upload.routes.ts";
import { createChatStreamRouter }   from "./routes/stream.routes.ts";

// ── Streams ──────────────────────────────────────────────────────────────────
import { createSseRouter }          from "./streams/sse.ts";
import { attachWebSocketServer }    from "./streams/ws-server.ts";

// ── Events ───────────────────────────────────────────────────────────────────
import { startConsoleLogPersister } from "./events/console-log-persister.ts";
import { attachAgentEventPersister } from "./run/event-persist.ts";

// ── Run subsystem ─────────────────────────────────────────────────────────────
import { runManager }               from "./run/controller.ts";
import { resolveProjectId, getOrCreateActiveProject } from "./run/active-project.ts";
import { waitForAnswer, resolveQuestion, pendingCount } from "./run/question-bus.ts";
import { runs }                     from "./run/registry.ts";

// ── Generator Orchestrator (lives in server/agents/) ─────────────────────────
import { generatorOrchestrator }    from "../agents/generator-orchestrator.ts";

// ─────────────────────────────────────────────────────────────────────────────

class ChatOrchestrator {
  // ── Run lifecycle ───────────────────────────────────────────────────────────
  get run() {
    return runManager;
  }

  get runRegistry(): ReadonlyMap<string, import("./run/types.ts").RunHandle> {
    return runs;
  }

  // ── Project helpers ─────────────────────────────────────────────────────────
  readonly project = {
    resolveId: (req: Request) => resolveProjectId(req),
    getActive: () => getOrCreateActiveProject(),
  };

  // ── Question bus ────────────────────────────────────────────────────────────
  readonly questions = {
    wait: (runId: string, questionId: string, defaultAnswer: string) =>
      waitForAnswer(runId, questionId, defaultAnswer),
    resolve: (runId: string, questionId: string, answer: string) =>
      resolveQuestion(runId, questionId, answer),
    pendingCount: () => pendingCount(),
  };

  // ── Generator Orchestrator ──────────────────────────────────────────────────
  /**
   * Unified access to ALL registered generator agents.
   * The orchestrator itself lives at server/agents/generator-orchestrator.ts.
   *
   *   .generators.code          → core code generation
   *   .generators.backend       → routes, controllers, auth, models, ...
   *   .generators.frontend      → components, pages, forms, state, ...
   *   .generators.database      → mongoose, prisma
   *   .generators.graphql       → schema + resolvers
   *   .generators.routing       → app-level route tree
   *   .generators.pwa           → service worker, manifest, app shell, ...
   *   .generators.devops        → docker-compose, github actions, env pipeline
   *   .generators.realtime      → chat feature, websocket server
   *   .generators.observability → logger, health, otel, prometheus
   */
  get generators() {
    return generatorOrchestrator;
  }

  // ── HTTP routers ────────────────────────────────────────────────────────────
  buildChatRouter(): Router {
    const router = Router();

    router.use("/", createChatHistoryRouter());
    router.use("/", createChatPromptsRouter());
    router.use("/", createChatMessagesRouter());
    router.use("/", createChatFeedbackRouter());
    router.use("/", createChatUploadRouter());
    router.use("/", createChatStreamRouter());

    router.post("/answer", (req: Request, res: Response) => {
      const { runId, questionId, answer } = req.body ?? {};
      if (!runId || !questionId || !answer) {
        return res.status(400).json({ ok: false, error: "runId, questionId, and answer are required" });
      }
      const resolved = this.questions.resolve(String(runId), String(questionId), String(answer));
      if (!resolved) {
        return res.status(404).json({ ok: false, error: "No pending question found for this runId/questionId" });
      }
      res.json({ ok: true, answer });
    });

    return router;
  }

  buildSseRouter(): Router {
    return createSseRouter();
  }

  // ── Real-time / WebSocket ───────────────────────────────────────────────────
  attachWebSocket(server: HttpServer): void {
    attachWebSocketServer(server);
  }

  // ── Background services ─────────────────────────────────────────────────────
  startPersistence(): void {
    startConsoleLogPersister();
    attachAgentEventPersister();
  }
}

export const chatOrchestrator = new ChatOrchestrator();
