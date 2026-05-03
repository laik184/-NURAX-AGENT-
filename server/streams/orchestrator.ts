import { createSseRouter } from "./sse.ts";
import { attachWebSocketServer } from "./ws-server.ts";
import { fail, ok, type PlatformServiceInput, type PlatformServiceResult } from "../orchestrator.types.ts";

const SERVICE = "streams";

export { createSseRouter, attachWebSocketServer };

const SSE_CHANNELS: readonly string[] = Object.freeze([
  "/api/agent/stream",
  "/sse/console",
  "/api/solopilot/stream",
  "/sse/files",
  "/api/stream",
  "/sse/agent",
  "/sse/preview",
  "/sse/file",
  "/events",
  "/api/solopilot/dashboard/stream",
  "/api/builds/:buildId/logs",
]);

const WS_CHANNELS: readonly string[] = Object.freeze([
  "/ws/terminal",
  "/ws/execute/:sessionId",
  "/ws/agent/:runId",
  "/ws/files/:projectId",
]);

export async function runStreamsOperation(
  input: PlatformServiceInput,
): Promise<PlatformServiceResult> {
  const op = input.operation;
  try {
    switch (op) {
      case "channels":
        return ok(SERVICE, op, { sse: SSE_CHANNELS, websocket: WS_CHANNELS });
      default:
        return fail(SERVICE, op, `unknown operation: ${op}`);
    }
  } catch (err) {
    return fail(SERVICE, op, err instanceof Error ? err.message : String(err));
  }
}
