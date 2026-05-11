/**
 * server/chat/index.ts
 *
 * Public surface of the chat module.
 *
 * RULE: Nothing outside server/chat/ should import from server/chat/ internals
 * directly. ALL access must go through chatOrchestrator or the named exports below.
 *
 * For generator agents use chatOrchestrator.generators.<namespace>.<fn>()
 * or import generatorOrchestrator directly from server/agents/generator-orchestrator.ts.
 */

export { chatOrchestrator } from "./orchestrator.ts";

// Shared types — safe to import directly (no side-effects)
export type { RunInput, RunHandle, CodeFile } from "./run/types.ts";

import { chatOrchestrator } from "./orchestrator.ts";
import type { Router } from "express";

export function createChatRouter(): Router {
  return chatOrchestrator.buildChatRouter();
}
