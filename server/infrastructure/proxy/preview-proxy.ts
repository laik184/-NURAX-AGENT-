/**
 * preview-proxy.ts
 *
 * HTTP proxy: /preview/:projectId/* → running project port.
 *
 * Port lookup reads ONLY from runtimeManager (single source of truth).
 * No local Maps, no stale caches — always resolves the live port.
 * Automatically correct after server restarts via persisted state recovery.
 *
 * Error handling:
 *   - No entry in registry         → 503 "server not started"
 *   - Entry exists, status=starting → 503 "server is starting" (not a 502)
 *   - Entry exists, ECONNREFUSED   → 503 "server is starting" (race window)
 *   - Other proxy errors           → 502 with full error detail
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import http from "http";
import { runtimeManager } from "../runtime/runtime-manager.ts";

export function createPreviewProxy(): Router {
  const router = Router();

  router.all("/:projectId/*", (req: Request, res: Response, _next: NextFunction) => {
    const projectId = Number(req.params.projectId);

    if (isNaN(projectId)) {
      res.status(400).json({ ok: false, error: "Invalid project ID" });
      return;
    }

    const entry = runtimeManager.get(projectId);

    if (!entry) {
      res.status(503).json({
        ok: false,
        error: `No running server for project ${projectId}. Start the server first.`,
        hint: "Use the server_start tool or POST /api/runtime/:projectId/start",
      });
      return;
    }

    // Process is registered but still binding to its port — give a clear signal
    // instead of letting the proxy ECONNREFUSED bubble up as a raw 502.
    if (entry.status === "starting") {
      res.status(503).json({
        ok: false,
        error: `Server for project ${projectId} is still starting up. Please wait a moment.`,
        status: "starting",
        pid: entry.pid,
        port: entry.port,
      });
      return;
    }

    const port = entry.port;
    const targetPath = req.url.replace(`/${projectId}`, "") || "/";
    const options: http.RequestOptions = {
      hostname: "127.0.0.1",
      port,
      path: targetPath,
      method: req.method,
      headers: { ...req.headers, host: `localhost:${port}` },
    };

    const proxy = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode ?? 200, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    });

    proxy.on("error", (err: NodeJS.ErrnoException) => {
      if (res.headersSent) return;

      // ECONNREFUSED: process is alive but port not yet bound (startup race)
      if (err.code === "ECONNREFUSED") {
        res.status(503).json({
          ok: false,
          error: `Server for project ${projectId} is not yet accepting connections. Try again in a moment.`,
          status: "starting",
          port,
          projectId,
        });
        return;
      }

      res.status(502).json({
        ok: false,
        error: `Proxy error: ${err.message}`,
        port,
        projectId,
      });
    });

    req.pipe(proxy, { end: true });
  });

  return router;
}

/**
 * Legacy shims — kept so any existing callers don't break.
 * runtimeManager is the authority; these are transparent read-throughs.
 * @deprecated Import runtimeManager directly instead.
 */
export function setProjectPort(_projectId: number, _port: number): void {
  // No-op: runtimeManager owns all port state.
}

export function getProjectPort(projectId: number): number | undefined {
  return runtimeManager.getPort(projectId);
}
