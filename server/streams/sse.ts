import { Router, type Request, type Response } from "express";
import { bus } from "../events/bus.ts";

function setupSse(res: Response): void {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();
  res.write(": connected\n\n");
}

function sseSend(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export function createSseRouter(): Router {
  const r = Router();

  // Frontend hook: useLiveAgentStream → /api/agent/stream
  r.get("/api/agent/stream", (req: Request, res: Response) => {
    setupSse(res);
    const runIdFilter = req.query.runId as string | undefined;
    const off = bus.on("agent.event", (e) => {
      if (runIdFilter && e.runId !== runIdFilter) return;
      sseSend(res, "agent", e);
    });
    const offLife = bus.on("run.lifecycle", (e) => {
      if (runIdFilter && e.runId !== runIdFilter) return;
      sseSend(res, "lifecycle", e);
    });
    const heartbeat = setInterval(() => res.write(": ping\n\n"), 15_000);
    req.on("close", () => {
      clearInterval(heartbeat);
      off();
      offLife();
    });
  });

  // Frontend: app-state-context → /sse/console
  r.get("/sse/console", (req: Request, res: Response) => {
    setupSse(res);
    const projectIdFilter = req.query.projectId ? Number(req.query.projectId) : null;
    const off = bus.on("console.log", (e) => {
      if (projectIdFilter !== null && e.projectId !== projectIdFilter) return;
      sseSend(res, "console", e);
    });
    const heartbeat = setInterval(() => res.write(": ping\n\n"), 15_000);
    req.on("close", () => {
      clearInterval(heartbeat);
      off();
    });
  });

  // Frontend: /api/solopilot/stream
  r.get("/api/solopilot/stream", (req: Request, res: Response) => {
    setupSse(res);
    const off = bus.on("console.log", (e) => sseSend(res, "solopilot", e));
    const heartbeat = setInterval(() => res.write(": ping\n\n"), 15_000);
    req.on("close", () => {
      clearInterval(heartbeat);
      off();
    });
  });

  // Frontend: /sse/files
  r.get("/sse/files", (req: Request, res: Response) => {
    setupSse(res);
    const projectIdFilter = req.query.projectId ? Number(req.query.projectId) : null;
    const off = bus.on("file.change", (e) => {
      if (projectIdFilter !== null && e.projectId !== projectIdFilter) return;
      sseSend(res, "file", e);
    });
    const heartbeat = setInterval(() => res.write(": ping\n\n"), 15_000);
    req.on("close", () => {
      clearInterval(heartbeat);
      off();
    });
  });

  // ── compat SSE channels (no-op-safe; emit existing bus events) ─────

  // useAgiStream → /api/stream (global event stream, last 200)
  r.get("/api/stream", (req: Request, res: Response) => {
    setupSse(res);
    const offA = bus.on("agent.event", (e) => sseSend(res, "agi", e));
    const offL = bus.on("run.lifecycle", (e) => sseSend(res, "agi", e));
    const offC = bus.on("console.log", (e) => sseSend(res, "agi", e));
    const heartbeat = setInterval(() => res.write(": ping\n\n"), 15_000);
    req.on("close", () => {
      clearInterval(heartbeat);
      offA();
      offL();
      offC();
    });
  });

  // use-agent-ultra-stream + file-explorer → /sse/agent
  r.get("/sse/agent", (req: Request, res: Response) => {
    setupSse(res);
    const runIdFilter = req.query.runId as string | undefined;
    const off = bus.on("agent.event", (e) => {
      if (runIdFilter && e.runId !== runIdFilter) return;
      sseSend(res, "agent", e);
      // Also push as default event so onmessage handlers fire
      res.write(`data: ${JSON.stringify(e)}\n\n`);
    });
    const heartbeat = setInterval(() => res.write(": ping\n\n"), 15_000);
    req.on("close", () => {
      clearInterval(heartbeat);
      off();
    });
  });

  // pages/preview.tsx → /sse/preview
  r.get("/sse/preview", (req: Request, res: Response) => {
    setupSse(res);
    const off = bus.on("console.log", (e) => sseSend(res, "preview", e));
    const offL = bus.on("run.lifecycle", (e) => sseSend(res, "preview", e));
    const heartbeat = setInterval(() => res.write(": ping\n\n"), 15_000);
    req.on("close", () => {
      clearInterval(heartbeat);
      off();
      offL();
    });
  });

  // BatchPanel → /sse/file?path=__batch__
  r.get("/sse/file", (req: Request, res: Response) => {
    setupSse(res);
    const off = bus.on("file.change", (e) => sseSend(res, "file", e));
    const heartbeat = setInterval(() => res.write(": ping\n\n"), 15_000);
    req.on("close", () => {
      clearInterval(heartbeat);
      off();
    });
  });

  // sse.ts client → /events (generic)
  r.get("/events", (req: Request, res: Response) => {
    setupSse(res);
    const offA = bus.on("agent.event", (e) => sseSend(res, "event", e));
    const offC = bus.on("console.log", (e) => sseSend(res, "event", e));
    const offF = bus.on("file.change", (e) => sseSend(res, "event", e));
    const offL = bus.on("run.lifecycle", (e) => sseSend(res, "event", e));
    const heartbeat = setInterval(() => res.write(": ping\n\n"), 15_000);
    req.on("close", () => {
      clearInterval(heartbeat);
      offA();
      offC();
      offF();
      offL();
    });
  });

  // DashboardPanel → /api/solopilot/dashboard/stream
  r.get("/api/solopilot/dashboard/stream", (req: Request, res: Response) => {
    setupSse(res);
    const off = bus.on("agent.event", (e) => sseSend(res, "dashboard", e));
    const offL = bus.on("run.lifecycle", (e) => sseSend(res, "dashboard", e));
    const heartbeat = setInterval(() => res.write(": ping\n\n"), 15_000);
    req.on("close", () => {
      clearInterval(heartbeat);
      off();
      offL();
    });
  });

  // LogsPanel → /api/builds/:buildId/logs
  r.get("/api/builds/:buildId/logs", (req: Request, res: Response) => {
    setupSse(res);
    const buildId = req.params.buildId;
    const off = bus.on("console.log", (e) => sseSend(res, "log", { buildId, ...e }));
    const heartbeat = setInterval(() => res.write(": ping\n\n"), 15_000);
    req.on("close", () => {
      clearInterval(heartbeat);
      off();
    });
  });

  return r;
}
