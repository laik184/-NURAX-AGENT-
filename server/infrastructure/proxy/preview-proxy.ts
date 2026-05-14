/**
 * preview-proxy.ts
 *
 * HTTP proxy: /preview/:projectId/* → running project port.
 *
 * Port lookup reads ONLY from ProcessRegistry (single source of truth).
 * No local maps, no stale caches — always resolves the live port.
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import http from "http";
import { processRegistry } from "../process/process-registry.ts";

export function createPreviewProxy(): Router {
  const router = Router();

  router.all("/:projectId/*", (req: Request, res: Response, _next: NextFunction) => {
    const projectId = Number(req.params.projectId);

    if (isNaN(projectId)) {
      res.status(400).json({ ok: false, error: "Invalid project ID" });
      return;
    }

    const port = processRegistry.getPort(projectId);

    if (!port) {
      res.status(503).json({
        ok: false,
        error: `No running server for project ${projectId}. Start the server first.`,
        hint: "Use the server_start tool or POST /api/runtime/:projectId/start",
      });
      return;
    }

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

    proxy.on("error", (err) => {
      if (!res.headersSent) {
        res.status(502).json({
          ok: false,
          error: `Proxy error: ${err.message}`,
          port,
          projectId,
        });
      }
    });

    req.pipe(proxy, { end: true });
  });

  return router;
}

/**
 * Legacy shim — kept so any existing callers don't break.
 * ProcessRegistry is now the authority; these are no-ops / read-throughs.
 */
export function setProjectPort(_projectId: number, _port: number): void {
  // No-op: ProcessRegistry owns all port state now.
}

export function getProjectPort(projectId: number): number | undefined {
  return processRegistry.getPort(projectId);
}
