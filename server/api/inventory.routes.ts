import { Router, type Request, type Response } from "express";
import { db } from "../infrastructure/db/index.ts";
import { projects, agentRuns, artifacts } from "../../shared/schema.ts";
import { sql } from "drizzle-orm";

export function createInventoryRouter(): Router {
  const router = Router();

  router.get("/", async (_req: Request, res: Response) => {
    try {
      const [projectCount] = await db.select({ count: sql<number>`count(*)` }).from(projects);
      const [runCount] = await db.select({ count: sql<number>`count(*)` }).from(agentRuns);
      const [artifactCount] = await db.select({ count: sql<number>`count(*)` }).from(artifacts);
      res.json({
        ok: true,
        inventory: {
          projects: Number(projectCount?.count || 0),
          agentRuns: Number(runCount?.count || 0),
          artifacts: Number(artifactCount?.count || 0),
        },
      });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.get("/tools", (_req: Request, res: Response) => {
    res.json({
      ok: true,
      tools: [
        { category: "file", tools: ["file_list", "file_read", "file_write", "file_delete", "file_search", "file_replace"] },
        { category: "shell", tools: ["shell_exec"] },
        { category: "package", tools: ["package_install", "package_uninstall", "package_audit", "detect_missing_packages"] },
        { category: "server", tools: ["server_start", "server_stop", "server_restart", "server_logs"] },
        { category: "preview", tools: ["preview_url", "preview_screenshot"] },
        { category: "env", tools: ["env_read", "env_write"] },
        { category: "git", tools: ["git_status", "git_add", "git_commit", "git_clone", "git_push", "git_pull"] },
        { category: "db", tools: ["db_push", "db_migrate"] },
        { category: "deploy", tools: ["deploy_publish"] },
        { category: "testing", tools: ["test_run", "debug_run", "monitor_check"] },
        { category: "browser", tools: ["browser_eval"] },
        { category: "network", tools: ["api_call", "search_web"] },
        { category: "auth", tools: ["auth_login"] },
        { category: "agent", tools: ["task_complete", "agent_message", "agent_question"] },
      ],
      total: 42,
    });
  });

  return router;
}
