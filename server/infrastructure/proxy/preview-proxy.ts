import { Router, type Request, type Response, type NextFunction } from "express";
import http from "http";

const projectPorts = new Map<string, number>();

export function setProjectPort(projectId: number, port: number): void {
  projectPorts.set(String(projectId), port);
}

export function getProjectPort(projectId: number): number | undefined {
  return projectPorts.get(String(projectId));
}

export function createPreviewProxy(): Router {
  const router = Router();

  router.all("/:projectId/*", (req: Request, res: Response, _next: NextFunction) => {
    const { projectId } = req.params;
    const port = projectPorts.get(projectId);

    if (!port) {
      res.status(503).json({
        ok: false,
        error: `No running server for project ${projectId}. Start the server first.`,
      });
      return;
    }

    const targetPath = req.url.replace(`/${projectId}`, "") || "/";
    const options = {
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
        res.status(502).json({ ok: false, error: `Proxy error: ${err.message}` });
      }
    });

    req.pipe(proxy, { end: true });
  });

  return router;
}
