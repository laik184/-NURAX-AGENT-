import { Router, type Request, type Response } from "express";
import http from "node:http";
import { resolveProjectId } from "../orchestration/active-project.ts";
import { projectRunner } from "../services/project-runner.service.ts";
import { packageManager } from "../services/package-manager.service.ts";
import { gitService } from "../services/git.service.ts";

function err(code: string, message: string) {
  return { ok: false as const, error: { code, message } };
}

export function createRuntimeRouter(): Router {
  const r = Router();

  r.post("/api/run-project", async (req: Request, res: Response) => {
    try {
      const projectId = await resolveProjectId(req);
      const { command, args, port } = (req.body || {}) as {
        command?: string;
        args?: string[];
        port?: number;
      };
      const meta = await projectRunner.start(projectId, { command, args, port });
      res.json({
        ok: true,
        projectId,
        status: meta.status,
        url: `/preview/${projectId}/`,
        port: meta.port,
        data: { ...meta, url: `/preview/${projectId}/` },
      });
    } catch (e: any) {
      res.status(500).json(err("RUN_FAILED", e?.message || "run failed"));
    }
  });

  r.post("/api/stop-project", async (req: Request, res: Response) => {
    try {
      const projectId = await resolveProjectId(req);
      const meta = await projectRunner.stop(projectId);
      res.json({
        ok: true,
        projectId,
        status: meta?.status || "stopped",
        data: { projectId, status: meta?.status || "stopped" },
      });
    } catch (e: any) {
      res.status(500).json(err("STOP_FAILED", e?.message || "stop failed"));
    }
  });

  r.post("/api/restart", async (req: Request, res: Response) => {
    try {
      const projectId = await resolveProjectId(req);
      const meta = await projectRunner.restart(projectId);
      res.json({
        ok: true,
        restarted: true,
        projectId,
        status: meta.status,
        port: meta.port,
        data: { restarted: true, ...meta },
      });
    } catch (e: any) {
      res.status(500).json(err("RESTART_FAILED", e?.message || "restart failed"));
    }
  });

  r.get("/api/project-status", async (req: Request, res: Response) => {
    try {
      const projectId = await resolveProjectId(req);
      const meta = projectRunner.get(projectId);
      res.json({
        ok: true,
        projectId,
        status: meta?.status || "stopped",
        port: meta?.port ?? null,
        data: meta || { projectId, status: "stopped" },
      });
    } catch (e: any) {
      res.status(500).json(err("STATUS_FAILED", e?.message || "status failed"));
    }
  });

  r.get("/api/tunnel-info", async (req: Request, res: Response) => {
    try {
      const projectId = await resolveProjectId(req);
      const info = projectRunner.tunnelInfo(projectId);
      res.json({ ok: true, ...info, projectId, data: { projectId, ...info } });
    } catch (e: any) {
      res.status(500).json(err("TUNNEL_FAILED", e?.message || "tunnel failed"));
    }
  });

  r.get("/api/runtime/logs", async (req: Request, res: Response) => {
    try {
      const projectId = await resolveProjectId(req);
      const limit = Math.min(Number(req.query.limit) || 200, 1000);
      const lines = projectRunner.recentLogs(projectId, limit);
      res.json({ ok: true, lines, data: { lines } });
    } catch (e: any) {
      res.status(500).json(err("LOGS_FAILED", e?.message || "logs failed"));
    }
  });

  r.get("/api/packages/list", async (req: Request, res: Response) => {
    try {
      const projectId = await resolveProjectId(req);
      const data = await packageManager.list(projectId);
      res.json({ ok: true, ...data, data });
    } catch (e: any) {
      res.status(500).json(err("LIST_FAILED", e?.message || "list failed"));
    }
  });

  r.post("/api/packages/install", async (req: Request, res: Response) => {
    try {
      const projectId = await resolveProjectId(req);
      const { packages = [], dev = false } = (req.body || {}) as {
        packages?: string[];
        dev?: boolean;
      };
      const result = await packageManager.install(projectId, packages, { dev });
      res.json({ ok: result.ok, ...result, data: result });
    } catch (e: any) {
      res.status(500).json(err("INSTALL_FAILED", e?.message || "install failed"));
    }
  });

  r.post("/api/packages/uninstall", async (req: Request, res: Response) => {
    try {
      const projectId = await resolveProjectId(req);
      const { packages = [] } = (req.body || {}) as { packages?: string[] };
      const result = await packageManager.uninstall(projectId, packages);
      res.json({ ok: result.ok, ...result, data: result });
    } catch (e: any) {
      res.status(500).json(err("UNINSTALL_FAILED", e?.message || "uninstall failed"));
    }
  });

  r.post("/api/packages/run", async (req: Request, res: Response) => {
    try {
      const projectId = await resolveProjectId(req);
      const { script } = (req.body || {}) as { script?: string };
      if (!script) return res.status(400).json(err("BAD_REQUEST", "script required"));
      const result = await packageManager.run(projectId, script);
      res.json({ ok: result.ok, ...result, data: result });
    } catch (e: any) {
      res.status(500).json(err("RUN_FAILED", e?.message || "run failed"));
    }
  });

  r.get("/api/git/status", async (req: Request, res: Response) => {
    try {
      const projectId = await resolveProjectId(req);
      const result = await gitService.status(projectId);
      res.json({ ok: result.ok, ...result, data: result });
    } catch (e: any) {
      res.status(500).json(err("STATUS_FAILED", e?.message || "status failed"));
    }
  });

  r.get("/api/git/log", async (req: Request, res: Response) => {
    try {
      const projectId = await resolveProjectId(req);
      const limit = Math.min(Number(req.query.limit) || 30, 200);
      const result = await gitService.log(projectId, limit);
      res.json({ ok: result.ok, ...result, data: result });
    } catch (e: any) {
      res.status(500).json(err("LOG_FAILED", e?.message || "log failed"));
    }
  });

  r.get("/api/screenshot", async (req: Request, res: Response) => {
    try {
      const projectId = await resolveProjectId(req);
      const meta = projectRunner.get(projectId);
      if (!meta || meta.status !== "running") {
        return res.status(409).json(err("NOT_RUNNING", "project is not running"));
      }
      const targetPath = (req.query.path as string) || "/";
      const url = `http://127.0.0.1:${meta.port}${targetPath.startsWith("/") ? targetPath : "/" + targetPath}`;
      const snap = await new Promise<{ status: number; headers: Record<string, string | string[] | undefined>; body: string }>((resolve, reject) => {
        const req2 = http.get(url, { timeout: 8000 }, (resp) => {
          let body = "";
          resp.on("data", (c) => (body += c.toString("utf-8")));
          resp.on("end", () =>
            resolve({ status: resp.statusCode || 0, headers: resp.headers, body }),
          );
        });
        req2.on("error", reject);
        req2.on("timeout", () => req2.destroy(new Error("request timed out")));
      });
      const titleMatch = snap.body.match(/<title>([^<]*)<\/title>/i);
      const textOnly = snap.body
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      res.json({
        ok: true,
        data: {
          url,
          status: snap.status,
          contentType: snap.headers["content-type"] || null,
          title: titleMatch?.[1] || null,
          excerpt: textOnly.slice(0, 800),
          html: snap.body.slice(0, 4000),
          bytes: snap.body.length,
        },
      });
    } catch (e: any) {
      res.status(500).json(err("SCREENSHOT_FAILED", e?.message || "screenshot failed"));
    }
  });

  return r;
}
