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
 *   │   ├── types.ts          → re-exported from index.ts
 *   │   └── (executor, tool-loop.executor, code-files, registry — run internals)
 *   ├── generator-orchestrator.ts → .generators (all generator agents)
 *   └── index.ts     → public surface
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

// ── Generator Orchestrator ───────────────────────────────────────────────────
import { generatorOrchestrator }    from "./generator-orchestrator.ts";

// ─────────────────────────────────────────────────────────────────────────────

class ChatOrchestrator {
  // ── Run lifecycle ───────────────────────────────────────────────────────────
  /**
   * RunController — start, cancel, and inspect agent runs.
   * Wraps: run/controller.ts + run/registry.ts
   */
  get run() {
    return runManager;
  }

  /**
   * Raw run registry map (read-only view).
   * Wraps: run/registry.ts → runs
   */
  get runRegistry(): ReadonlyMap<string, import("./run/types.ts").RunHandle> {
    return runs;
  }

  // ── Project helpers ─────────────────────────────────────────────────────────
  /**
   * Helpers for resolving the active project from a request or the DB.
   * Wraps: run/active-project.ts
   */
  readonly project = {
    /** Resolve projectId from body / query / header, validated against DB. */
    resolveId: (req: Request) => resolveProjectId(req),
    /** Return the most recently updated project id, or null. */
    getActive: () => getOrCreateActiveProject(),
  };

  // ── Question bus ────────────────────────────────────────────────────────────
  /**
   * Agent question / answer flow.
   * Wraps: run/question-bus.ts
   */
  readonly questions = {
    /** Register a pending question; returns a Promise that resolves on answer. */
    wait: (runId: string, questionId: string, defaultAnswer: string) =>
      waitForAnswer(runId, questionId, defaultAnswer),
    /** Resolve a pending question from a user answer. Returns true if found. */
    resolve: (runId: string, questionId: string, answer: string) =>
      resolveQuestion(runId, questionId, answer),
    /** How many questions are currently waiting for an answer. */
    pendingCount: () => pendingCount(),
  };

  // ── Generator Orchestrator ──────────────────────────────────────────────────
  /**
   * Unified access to ALL registered generator agents.
   *
   * Namespaces:
   *   .generators.code          → core code generation
   *   .generators.backend       → routes, controllers, auth, models,
   *                               middleware, services, migrations,
   *                               API docs, env config
   *   .generators.frontend      → components, pages, forms, state,
   *                               styles, tests, API clients
   *   .generators.database      → mongoose, prisma schema generators
   *   .generators.graphql       → schema + resolver generators
   *   .generators.routing       → app-level route tree generator
   *   .generators.pwa           → service worker, manifest, app shell,
   *                               install prompt, offline strategy,
   *                               push notifications
   *   .generators.devops        → docker-compose, github actions,
   *                               env pipeline validator
   *   .generators.realtime      → chat feature, websocket server
   *   .generators.observability → logger, health, opentelemetry,
   *                               prometheus metrics
   *
   * Wraps: server/chat/generator-orchestrator.ts
   */
  get generators() {
    return generatorOrchestrator;
  }

  // ── HTTP routers ────────────────────────────────────────────────────────────
  /**
   * Build the Express router for all /api/chat/* endpoints.
   * Mounts: history, prompts, messages, feedback, upload, stream, answer.
   */
  buildChatRouter(): Router {
    const router = Router();

    router.use("/", createChatHistoryRouter());
    router.use("/", createChatPromptsRouter());
    router.use("/", createChatMessagesRouter());
    router.use("/", createChatFeedbackRouter());
    router.use("/", createChatUploadRouter());
    router.use("/", createChatStreamRouter());

    // User-answer endpoint — unblocks an agent waiting on question-bus
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

  /**
   * Build the Express router for all SSE stream endpoints.
   * Wraps: streams/sse.ts
   */
  buildSseRouter(): Router {
    return createSseRouter();
  }

  // ── Real-time / WebSocket ───────────────────────────────────────────────────
  /**
   * Attach WebSocket server to the HTTP server.
   * Wraps: streams/ws-server.ts
   */
  attachWebSocket(server: HttpServer): void {
    attachWebSocketServer(server);
  }

  // ── Background services ─────────────────────────────────────────────────────
  /**
   * Start ALL background event persistence services.
   * Wraps: events/console-log-persister.ts + run/event-persist.ts
   *
   * Call once at server startup (main.ts). Idempotent for event-persist.
   */
  startPersistence(): void {
    startConsoleLogPersister();
    attachAgentEventPersister();
  }
}

export const chatOrchestrator = new ChatOrchestrator();
