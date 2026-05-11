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
 *   │   ├── registry.ts       → .runRegistry
 *   │   ├── active-project.ts → .project.resolveId(), .project.getActive()
 *   │   ├── question-bus.ts   → .questions.wait(), .questions.resolve()
 *   │   ├── event-persist.ts  → started inside startPersistence()
 *   │   └── types.ts          → re-exported from index.ts
 *   └── index.ts     → public surface
 *
 * Pipeline connection:
 *   server/agents/core/pipeline/  →  .pipeline.*
 *     .pipeline.execute()         → executePipeline() — 9-phase full run
 *     .pipeline.dispatch()        → dispatch() — capability-based worker dispatch
 *     .pipeline.dispatchById()    → dispatchById() — dispatch by orchestrator ID
 *     .pipeline.getMetrics()      → pipeline run metrics (success/fail/avg ms)
 *     .pipeline.registry.*        → findByCapability / findById / findByDomain / getStats
 *
 * Generator agents:
 *   server/agents/generator-orchestrator.ts  →  .generators.*
 */

import { Router } from "express";
import type { Server as HttpServer } from "http";
import type { Request, Response } from "express";

// ── Routes ────────────────────────────────────────────────────────────────────
import { createChatHistoryRouter }  from "./routes/history.routes.ts";
import { createChatPromptsRouter }  from "./routes/prompts.routes.ts";
import { createChatMessagesRouter } from "./routes/messages.routes.ts";
import { createChatFeedbackRouter } from "./routes/feedback.routes.ts";
import { createChatUploadRouter }   from "./routes/upload.routes.ts";
import { createChatStreamRouter }   from "./routes/stream.routes.ts";

// ── Streams ───────────────────────────────────────────────────────────────────
import { createSseRouter }          from "./streams/sse.ts";
import { attachWebSocketServer }    from "./streams/ws-server.ts";

// ── Events ────────────────────────────────────────────────────────────────────
import { startConsoleLogPersister } from "./events/console-log-persister.ts";
import { attachAgentEventPersister } from "./run/event-persist.ts";

// ── Run subsystem ─────────────────────────────────────────────────────────────
import { runManager }               from "./run/controller.ts";
import { resolveProjectId, getOrCreateActiveProject } from "./run/active-project.ts";
import { waitForAnswer, resolveQuestion, pendingCount } from "./run/question-bus.ts";
import { runs }                     from "./run/registry.ts";

// ── Pipeline ──────────────────────────────────────────────────────────────────
import { executePipeline, getMetrics as getPipelineMetrics } from "../agents/core/pipeline/index.ts";
import { dispatch, dispatchById, getRegistryStats }          from "../agents/core/pipeline/registry/dispatcher.ts";
import {
  findByCapability,
  findById,
  findByDomain,
  ORCHESTRATOR_REGISTRY,
} from "../agents/core/pipeline/registry/orchestrator.registry.ts";
import type { PipelineInput, PipelineOutput, PipelineMetrics } from "../agents/core/pipeline/types.ts";
import type { DispatchRequest, DispatchSummary }               from "../agents/core/pipeline/registry/dispatcher.ts";
import type { OrchestratorEntry, OrchestratorDomain }         from "../agents/core/pipeline/registry/orchestrator.registry.ts";

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

  // ── Pipeline ─────────────────────────────────────────────────────────────────
  /**
   * Full pipeline access — connects chatOrchestrator to the 9-phase agent pipeline.
   *
   * Flow when using .pipeline.execute():
   *   Safety → Routing → Decision → Planning → Validation
   *   → Generation (dispatches to registry workers) → Execution
   *   → Recovery (if needed) → Feedback → Memory → Complete
   *
   * Flow when using .run.runGoal({ mode: "pipeline" }):
   *   Same pipeline, but with DB persistence + SSE/WS streaming via run system.
   */
  readonly pipeline = {
    /**
     * Execute the full 9-phase pipeline directly.
     * For DB-persisted, SSE-streamed runs use:
     *   chatOrchestrator.run.runGoal({ goal, projectId, mode: "pipeline" })
     */
    execute: (input: PipelineInput): Promise<PipelineOutput> =>
      executePipeline(input),

    /** Get cumulative pipeline run metrics (total, success, failure, avg duration). */
    getMetrics: (): PipelineMetrics =>
      getPipelineMetrics(),

    /**
     * Dispatch to worker orchestrators in the registry by capability keywords.
     * Only 'generation', 'intelligence', 'security', 'observability',
     * 'devops', 'infrastructure', 'data', 'realtime' domains are allowed.
     */
    dispatch: (req: DispatchRequest): Promise<DispatchSummary> =>
      dispatch(req),

    /**
     * Dispatch to specific worker orchestrators by their registry ID.
     * Example: dispatchById(['backend-gen:auth', 'frontend-gen:component'], input)
     */
    dispatchById: (ids: readonly string[], input: unknown): Promise<DispatchSummary> =>
      dispatchById(ids, input),

    /** Orchestrator registry queries — inspect registered workers. */
    registry: {
      /** All registered orchestrator entries. */
      all: ORCHESTRATOR_REGISTRY as readonly OrchestratorEntry[],

      /** Get a count summary by domain. */
      getStats: () => getRegistryStats(),

      /** Find worker orchestrators matching a capability keyword. */
      findByCapability: (capability: string): readonly OrchestratorEntry[] =>
        findByCapability(capability),

      /** Find a single orchestrator entry by its registry ID. */
      findById: (id: string): OrchestratorEntry | undefined =>
        findById(id),

      /** Find all orchestrator entries in a given domain. */
      findByDomain: (domain: OrchestratorDomain): readonly OrchestratorEntry[] =>
        findByDomain(domain),
    },
  } as const;

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
