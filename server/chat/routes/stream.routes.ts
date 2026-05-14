/**
 * stream.routes.ts — Token and lifecycle streaming endpoints
 *
 * Uses shared SSE utilities from sse-utils.ts (single source of truth).
 * These routes are mounted under the /api/chat prefix by chat/index.ts.
 */

import { Router, type Request, type Response } from "express";
import { bus } from "../../infrastructure/events/bus.ts";
import { setupSse, sseSend, startHeartbeat, onClose } from "../streams/sse-utils.ts";

async function emitAsTokens(res: Response, text: string, runId: string): Promise<void> {
  const words = text.split(/(\s+)/);
  for (const word of words) {
    if (!word) continue;
    sseSend(res, "token", { runId, token: word });
    await new Promise<void>((r) => setTimeout(r, 16));
  }
  sseSend(res, "token_done", { runId });
}

export function createChatStreamRouter(): Router {
  const router = Router();

  // ── Word-by-word token stream (agent messages only) ──────────────────────────
  router.get("/stream/tokens", (req: Request, res: Response) => {
    setupSse(res);
    const runIdFilter = req.query.runId ? String(req.query.runId) : null;

    const off1 = bus.subscribe("agent.event", async (e) => {
      if (runIdFilter && e.runId !== runIdFilter) return;
      if (e.eventType !== "agent.message") return;
      const text =
        typeof e.payload === "string"
          ? e.payload
          : (e.payload as Record<string, unknown>)?.text as string ?? "";
      if (text) await emitAsTokens(res, text, e.runId);
    });

    const off2 = bus.subscribe("run.lifecycle", (e) => {
      if (runIdFilter && e.runId !== runIdFilter) return;
      sseSend(res, "lifecycle", { runId: e.runId, status: e.status });
      if (["completed", "failed", "cancelled"].includes(e.status)) {
        sseSend(res, "stream_end", { runId: e.runId });
      }
    });

    onClose(req, startHeartbeat(res), off1, off2);
  });

  // ── Lifecycle-only stream ────────────────────────────────────────────────────
  router.get("/stream/lifecycle", (req: Request, res: Response) => {
    setupSse(res);
    const runIdFilter = req.query.runId ? String(req.query.runId) : null;
    const off = bus.subscribe("run.lifecycle", (e) => {
      if (runIdFilter && e.runId !== runIdFilter) return;
      sseSend(res, "lifecycle", { runId: e.runId, status: e.status, ts: e.ts });
    });
    onClose(req, startHeartbeat(res), off);
  });

  return router;
}
