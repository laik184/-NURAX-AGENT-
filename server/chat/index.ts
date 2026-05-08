/**
 * server/chat/index.ts
 *
 * Public surface of the chat module.
 *
 * RULE: Nothing outside server/chat/ should import from server/chat/ internals
 * directly. ALL access must go through chatOrchestrator or the named exports
 * below.
 *
 * What the orchestrator controls:
 *   routes/      → buildChatRouter()
 *   streams/     → buildSseRouter(), attachWebSocket()
 *   events/      → startPersistence()
 *   run/controller.ts     → .run
 *   run/registry.ts       → .runRegistry
 *   run/active-project.ts → .project.resolveId(), .project.getActive()
 *   run/question-bus.ts   → .questions.wait(), .questions.resolve(), .questions.pendingCount()
 *   run/event-persist.ts  → started inside startPersistence()
 */

export { chatOrchestrator } from "./orchestrator.ts";

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
