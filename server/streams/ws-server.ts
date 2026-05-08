/**
 * @deprecated
 * This file is a backward-compatibility re-export.
 * WebSocket server is controlled by ChatOrchestrator.attachWebSocket().
 * All new code should use: chatOrchestrator.attachWebSocket(server)
 * Direct import kept only for legacy tooling that references this path.
 */
export { attachWebSocketServer } from "../chat/streams/ws-server.ts";
