/**
 * server/chat/index.ts
 *
 * Entry point for the chat module.
 * Exports the ChatOrchestrator — the single surface that main.ts uses
 * to mount all chat routes, streams, and services.
 */

export { chatOrchestrator } from "./orchestrator.ts";
