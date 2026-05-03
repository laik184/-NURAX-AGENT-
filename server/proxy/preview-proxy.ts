import { Router, type Request, type Response, type NextFunction } from "express";
import { createProxyMiddleware, type Options } from "http-proxy-middleware";
import { projectRunner } from "../services/project-runner.service.ts";

/**
 * Mounted at /preview. URL form:
 *   /preview/<projectId>/<rest...>
 *
 * Looks up the running child process for <projectId> and proxies the
 * remaining path to its localhost port. Returns a friendly HTML message
 * if the project isn't running.
 */
export function createPreviewProxy(): Router {
  const r = Router();

  const proxyCache = new Map<number, ReturnType<typeof createProxyMiddleware>>();

  function getProxy(projectId: number, port: number) {
    const existing = proxyCache.get(projectId);
    if (existing) return existing;
    const opts: Options = {
      target: `http://127.0.0.1:${port}`,
      changeOrigin: true,
      ws: true,
      xfwd: true,
      pathRewrite: (p) => p.replace(new RegExp(`^/${projectId}`), "") || "/",
      onError: (err, _req, res) => {
        try {
          // @ts-expect-error response is express
          res.status(502).type("html").send(
            `<h2>Preview unavailable</h2><p>${err.message}</p>`,
          );
        } catch {
          /* ignore */
        }
      },
    };
    const mw = createProxyMiddleware(opts);
    proxyCache.set(projectId, mw);
    return mw;
  }

  r.use("/:projectId", (req: Request, res: Response, next: NextFunction) => {
    const projectId = Number(req.params.projectId);
    if (!Number.isFinite(projectId)) {
      return res.status(400).type("html").send("<h2>Invalid project id</h2>");
    }
    const meta = projectRunner.get(projectId);
    if (!meta || meta.status === "stopped" || meta.status === "crashed") {
      return res
        .status(503)
        .type("html")
        .send(
          `<!doctype html><html><head><title>Preview not running</title>
          <style>body{font-family:system-ui;background:#0b1020;color:#e6e6f0;padding:40px;}
          .card{max-width:640px;margin:0 auto;background:#11172e;border:1px solid #2a2f4f;border-radius:8px;padding:24px;}
          code{background:#000;padding:2px 6px;border-radius:4px;}</style></head>
          <body><div class="card">
            <h2>Preview not running</h2>
            <p>Project <code>${projectId}</code> is not started. Status: <b>${meta?.status || "stopped"}</b>.</p>
            <p>Start it with: <code>POST /api/run-project</code></p>
          </div></body></html>`,
        );
    }
    // Re-mount path so the proxy sees /<projectId>/...
    req.url = `/${projectId}${req.url}`;
    const proxy = getProxy(projectId, meta.port);
    return (proxy as unknown as (req: Request, res: Response, next: NextFunction) => void)(
      req,
      res,
      next,
    );
  });

  return r;
}
