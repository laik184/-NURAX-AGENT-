import { Router, type Request, type Response } from "express";
import { spawn } from "child_process";
import { getProjectDir, ensureProjectDir } from "../infrastructure/sandbox/sandbox.util.ts";
import { setProjectPort, getProjectPort } from "../infrastructure/proxy/preview-proxy.ts";
import { db } from "../infrastructure/db/index.ts";
import { projects } from "../../shared/schema.ts";
import { eq } from "drizzle-orm";

interface ServerState {
  pid: number;
  port: number;
  logs: string[];
  startedAt: number;
  kill: () => void;
}

const runningServers = new Map<number, ServerState>();

function allocatePort(projectId: number): number {
  return 5000 + (projectId % 1000);
}

export function createRuntimeRouter(): Router {
  const router = Router();

  router.post("/api/runtime/:projectId/start", async (req: Request, res: Response) => {
    try {
      const projectId = Number(req.params.projectId);
      await ensureProjectDir(projectId);
      const projectDir = getProjectDir(projectId);

      if (runningServers.has(projectId)) {
        const state = runningServers.get(projectId)!;
        return res.json({ ok: true, already_running: true, port: state.port, pid: state.pid });
      }

      const port = allocatePort(projectId);
      const logs: string[] = [];

      const proc = spawn("npm", ["run", "dev"], {
        cwd: projectDir,
        env: { ...process.env, PORT: String(port), NODE_ENV: "development" },
        shell: false,
        detached: false,
      });

      proc.stdout.on("data", (d: Buffer) => {
        const line = d.toString().trim();
        logs.push(line);
        if (logs.length > 300) logs.shift();
      });
      proc.stderr.on("data", (d: Buffer) => {
        const line = d.toString().trim();
        logs.push(`[stderr] ${line}`);
        if (logs.length > 300) logs.shift();
      });
      proc.on("exit", () => runningServers.delete(projectId));

      runningServers.set(projectId, {
        pid: proc.pid!,
        port,
        logs,
        startedAt: Date.now(),
        kill: () => proc.kill("SIGTERM"),
      });
      setProjectPort(projectId, port);

      await db.update(projects).set({ status: "running", updatedAt: new Date() }).where(eq(projects.id, projectId));

      await new Promise((r) => setTimeout(r, 1500));

      res.json({ ok: true, started: true, port, pid: proc.pid, projectId });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.post("/api/runtime/:projectId/stop", async (req: Request, res: Response) => {
    try {
      const projectId = Number(req.params.projectId);
      const state = runningServers.get(projectId);
      if (!state) return res.json({ ok: true, message: "No running server" });
      state.kill();
      runningServers.delete(projectId);
      await db.update(projects).set({ status: "idle", updatedAt: new Date() }).where(eq(projects.id, projectId));
      res.json({ ok: true, stopped: true, projectId });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.post("/api/runtime/:projectId/restart", async (req: Request, res: Response) => {
    try {
      const projectId = Number(req.params.projectId);
      const existing = runningServers.get(projectId);
      if (existing) { existing.kill(); runningServers.delete(projectId); }
      await new Promise((r) => setTimeout(r, 500));
      req.method = "POST";
      res.redirect(307, `/api/runtime/${projectId}/start`);
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.get("/api/runtime/:projectId/logs", (req: Request, res: Response) => {
    const projectId = Number(req.params.projectId);
    const state = runningServers.get(projectId);
    const tail = Number(req.query.tail) || 50;
    if (!state) return res.json({ ok: true, running: false, logs: [] });
    res.json({ ok: true, running: true, port: state.port, logs: state.logs.slice(-tail) });
  });

  router.get("/api/runtime/:projectId/status", (req: Request, res: Response) => {
    const projectId = Number(req.params.projectId);
    const state = runningServers.get(projectId);
    res.json({
      ok: true,
      projectId,
      running: !!state,
      port: state?.port || null,
      pid: state?.pid || null,
      uptimeMs: state ? Date.now() - state.startedAt : null,
    });
  });

  router.post("/api/runtime/:projectId/packages/install", async (req: Request, res: Response) => {
    try {
      const projectId = Number(req.params.projectId);
      const { packages, dev } = req.body;
      const projectDir = getProjectDir(projectId);
      const args = ["install", ...(dev ? ["--save-dev"] : []), ...(packages || [])];
      const result = await new Promise<{ ok: boolean; stdout: string; stderr: string }>((resolve) => {
        let stdout = "";
        let stderr = "";
        const proc = spawn("npm", args, { cwd: projectDir, shell: false });
        proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
        proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });
        proc.on("close", (code) => resolve({ ok: code === 0, stdout: stdout.slice(-5000), stderr: stderr.slice(-2000) }));
        proc.on("error", (e) => resolve({ ok: false, stdout: "", stderr: e.message }));
      });
      res.json({ ok: result.ok, ...result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.post("/api/runtime/:projectId/git/:action", async (req: Request, res: Response) => {
    try {
      const projectId = Number(req.params.projectId);
      const action = req.params.action;
      const projectDir = getProjectDir(projectId);
      let gitArgs: string[] = [];
      if (action === "status") gitArgs = ["status", "--short"];
      else if (action === "add") gitArgs = ["add", ...(req.body.paths || ["."])];
      else if (action === "commit") gitArgs = ["-c", "user.email=agent@nura-x.dev", "-c", "user.name=NURA-X", "commit", "-m", req.body.message || "Auto commit"];
      else return res.status(400).json({ ok: false, error: `Unknown git action: ${action}` });

      const result = await new Promise<{ ok: boolean; stdout: string; stderr: string }>((resolve) => {
        let stdout = "";
        let stderr = "";
        const proc = spawn("git", gitArgs, { cwd: projectDir, shell: false });
        proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
        proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });
        proc.on("close", (code) => resolve({ ok: code === 0, stdout, stderr }));
        proc.on("error", (e) => resolve({ ok: false, stdout: "", stderr: e.message }));
      });
      res.json({ ok: result.ok, action, ...result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.get("/api/runtime/:projectId/screenshot", async (req: Request, res: Response) => {
    const projectId = Number(req.params.projectId);
    const port = getProjectPort(projectId) || allocatePort(projectId);
    const url = process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : `http://localhost:${port}`;
    res.json({ ok: true, url, port, message: "Navigate to this URL to see the preview." });
  });

  return router;
}
