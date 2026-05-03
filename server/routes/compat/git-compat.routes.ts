import { Router, type Request, type Response } from "express";
import { resolveProjectId } from "../../orchestration/active-project.ts";
import { gitService } from "../../services/git.service.ts";
import { err } from "./_shared.ts";

export function registerGitCompatRoutes(r: Router): void {
  r.post("/api/git/init", async (req: Request, res: Response) => {
    try {
      const projectId = await resolveProjectId(req);
      const result = await gitService.init(projectId);
      res.json({
        ok: result.ok,
        data: { projectId, initialized: result.ok, ...result },
        ...result,
      });
    } catch (e: any) {
      res.status(500).json(err("GIT_INIT_FAILED", e?.message || "git init failed"));
    }
  });

  r.post("/api/git/commit", async (req: Request, res: Response) => {
    const { message } = (req.body || {}) as { message?: string };
    try {
      const projectId = await resolveProjectId(req);
      const result = await gitService.commit(projectId, message || "agent commit");
      res.json({
        ok: result.ok,
        data: {
          committed: result.ok,
          message: message || "agent commit",
          sha: result.sha,
          stdout: result.stdout,
          stderr: result.stderr,
        },
        sha: result.sha,
      });
    } catch (e: any) {
      res.status(500).json(err("GIT_COMMIT_FAILED", e?.message || "git commit failed"));
    }
  });
}
