import type { Server as HttpServer } from "http";
import { chatOrchestrator } from "../chat/index.ts";
export function attachWebSocketServer(server: HttpServer) {
  return chatOrchestrator.attachWebSocket(server);
}
