import { Router, type Request, type Response } from "express";
import { bus } from "../../infrastructure/events/bus.ts";

function setupSse(res: Response): void {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();
  res.write(": connected\n\n");
}

function sseWrite(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

async function emitAsTokens(res: Response, text: string, runId: string): Promise<void> {
  const words = text.split(/(\s+)/);
  for (const word of words) {
    if (!word) continue;
    sseWrite(res, "token", { runId, token: word });
    await new Promise<void>((r) => setTimeout(r, 16));
  }
  sseWrite(res, "token_done", { runId });
}

export function createChatStreamRouter(): Router {
  const router = Router();

  router.get("/stream/tokens", (req: Request, res: Response) => {
    setupSse(res);
    const runIdFilter = req.query.runId ? String(req.query.runId) : null;

    const offAgent = bus.subscribe("agent.event", async (e) => {
      if (runIdFilter && e.runId !== runIdFilter) return;
      if (e.eventType !== "agent.message") return;
      const text =
        typeof e.payload === "string"
          ? e.payload
          : (e.payload as Record<string, unknown>)?.text as string ?? "";
      if (text) await emitAsTokens(res, text, e.runId);
    });

    const offLife = bus.subscribe("run.lifecycle", (e) => {
      if (runIdFilter && e.runId !== runIdFilter) return;
      sseWrite(res, "lifecycle", { runId: e.runId, status: e.status });
      if (["completed", "failed", "cancelled"].includes(e.status)) {
        sseWrite(res, "stream_end", { runId: e.runId });
      }
    });

    const heartbeat = setInterval(() => res.write(": ping\n\n"), 15_000);
    req.on("close", () => { clearInterval(heartbeat); offAgent(); offLife(); });
  });

  router.get("/stream/lifecycle", (req: Request, res: Response) => {
    setupSse(res);
    const runIdFilter = req.query.runId ? String(req.query.runId) : null;
    const off = bus.subscribe("run.lifecycle", (e) => {
      if (runIdFilter && e.runId !== runIdFilter) return;
      sseWrite(res, "lifecycle", { runId: e.runId, status: e.status, ts: e.ts });
    });
    const heartbeat = setInterval(() => res.write(": ping\n\n"), 15_000);
    req.on("close", () => { clearInterval(heartbeat); off(); });
  });

  return router;
}
