/**
 * server/chat/index.ts
 *
 * Public surface of the chat module.
 *
 * RULE: Nothing outside server/chat/ should import from server/chat/ internals
 * directly. ALL access must go through chatOrchestrator / generatorOrchestrator
 * or the named exports below.
 *
 * What chatOrchestrator controls:
 *   routes/                   → buildChatRouter()
 *   streams/                  → buildSseRouter(), attachWebSocket()
 *   events/                   → startPersistence()
 *   run/controller.ts         → .run
 *   run/registry.ts           → .runRegistry
 *   run/active-project.ts     → .project.resolveId(), .project.getActive()
 *   run/question-bus.ts       → .questions.wait(), .questions.resolve(), .questions.pendingCount()
 *   run/event-persist.ts      → started inside startPersistence()
 *   generator-orchestrator.ts → .generators.<namespace>.<fn>()
 *
 * What generatorOrchestrator exposes (namespaced):
 *   .code         → core code generation
 *   .backend      → routes, controllers, auth, models, middleware, services,
 *                   migrations, API docs, env config
 *   .frontend     → components, pages, forms, state, styles, tests, API clients
 *   .database     → mongoose, prisma schema generators
 *   .graphql      → schema + resolver generators
 *   .routing      → app-level route tree generator
 *   .pwa          → service worker, manifest, app shell, install prompt,
 *                   offline strategy, push notifications
 *   .devops       → docker-compose, github actions, env pipeline validator
 *   .realtime     → chat feature, websocket server
 *   .observability → logger, health, opentelemetry, prometheus metrics
 */

export { chatOrchestrator } from "./orchestrator.ts";
export { generatorOrchestrator } from "./generator-orchestrator.ts";

// Shared types — safe to import directly (no side-effects)
export type { RunInput, RunHandle, CodeFile } from "./run/types.ts";

/**
 * Convenience factory — wraps chatOrchestrator.buildChatRouter().
 * Use this when you need a plain Router factory reference.
 */
import { chatOrchestrator } from "./orchestrator.ts";
import type { Router } from "express";

export function createChatRouter(): Router {
  return chatOrchestrator.buildChatRouter();
}
