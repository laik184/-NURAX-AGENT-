/**
 * @deprecated
 * This file is a backward-compatibility re-export.
 * SSE router is controlled by ChatOrchestrator.buildSseRouter().
 * All new code should use: chatOrchestrator.buildSseRouter()
 * Direct import kept only for legacy tooling that references this path.
 */
export { createSseRouter } from "../chat/streams/sse.ts";
