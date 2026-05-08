/**
 * server/chat/index.ts
 *
 * Entry point for the chat module.
 * Exports the ChatOrchestrator — the single surface that main.ts and all
 * external modules use to access chat routes, streams, run management,
 * and background services.
 *
 * RULE: Nothing outside server/chat/ should import from server/chat/ internals
 * directly. All access must go through chatOrchestrator or the helpers below.
 */

export { chatOrchestrator } from "./orchestrator.ts";

/**
 * Convenience factory — wraps chatOrchestrator.buildChatRouter().
 * Use this when you need a plain Router factory reference
 * (e.g. server/api/orchestrator.ts route manifest).
 */
import { chatOrchestrator } from "./orchestrator.ts";
import type { Router } from "express";

export function createChatRouter(): Router {
  return chatOrchestrator.buildChatRouter();
}
