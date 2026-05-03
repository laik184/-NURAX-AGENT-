/**
 * chat.routes.ts
 * Backend-driven chat features that Replit exposes:
 *   GET  /api/chat/history   — real run history from DB (replaces mock)
 *   GET  /api/chat/prompts   — context-aware suggested prompts per project
 *   POST /api/chat/answer    — user answers a pending agent_question, unblocks loop
 */

import { Router } from "express";
import { db } from "../db/index.ts";
import { agentRuns, projects } from "../../shared/schema.ts";
import { eq, desc } from "drizzle-orm";
import { resolveQuestion } from "../orchestration/question-bus.ts";

/* ─────────────── Suggested prompts by project context ─────────────── */

const BASE_PROMPTS = [
  "Check my app for bugs",
  "Add user authentication",
  "Connect a database",
  "Add payment processing",
  "Write tests for my code",
  "Improve performance",
  "Add dark mode",
  "Create an API endpoint",
];

const FRAMEWORK_PROMPTS: Record<string, string[]> = {
  react:    ["Add a new React component", "Set up React Router", "Add Zustand state management"],
  nextjs:   ["Add a new Next.js page", "Set up API routes", "Add Server Components"],
  express:  ["Add an Express middleware", "Set up error handling", "Add request validation"],
  vite:     ["Optimize Vite build", "Add HMR config", "Set up path aliases"],
  postgres: ["Add a DB migration", "Create a new table", "Add indexes for performance"],
};

async function getProjectPrompts(projectId: number): Promise<string[]> {
  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)
    .then((r) => r[0] ?? null);

  const extra: string[] = [];
  if (project?.framework) {
    const fw = project.framework.toLowerCase();
    for (const [key, prompts] of Object.entries(FRAMEWORK_PROMPTS)) {
      if (fw.includes(key)) extra.push(...prompts);
    }
  }
  // Merge: project-specific first, then base (no duplicates)
  const seen = new Set<string>();
  const all: string[] = [];
  for (const p of [...extra, ...BASE_PROMPTS]) {
    if (!seen.has(p)) { seen.add(p); all.push(p); }
  }
  return all.slice(0, 8);
}

/* ─────────────── Route helpers ─────────────── */

function relativeTime(date: Date | null): string {
  if (!date) return "";
  const diff = Date.now() - date.getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 2)   return "just now";
  if (mins  < 60)  return `${mins} minutes ago`;
  if (hours < 24)  return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (days  < 2)   return "Yesterday";
  if (days  < 7)   return `${days} days ago`;
  return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? "s" : ""} ago`;
}

/* ─────────────── Router factory ─────────────── */

export function createChatRouter(): Router {
  const router = Router();

  /* GET /api/chat/history?projectId=1 */
  router.get("/history", async (req, res) => {
    const projectId = Number(req.query.projectId) || 1;
    try {
      const runs = await db
        .select({
          id:        agentRuns.id,
          goal:      agentRuns.goal,
          status:    agentRuns.status,
          startedAt: agentRuns.startedAt,
        })
        .from(agentRuns)
        .where(eq(agentRuns.projectId, projectId))
        .orderBy(desc(agentRuns.startedAt))
        .limit(30);

      const history = runs.map((r, idx) => ({
        id:     r.id,
        title:  r.goal.length > 80 ? r.goal.slice(0, 80) + "…" : r.goal,
        time:   relativeTime(r.startedAt ?? null),
        status: r.status ?? "completed",
        active: idx === 0,
      }));

      res.json({ ok: true, history });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e?.message ?? String(e) });
    }
  });

  /* GET /api/chat/prompts?projectId=1 */
  router.get("/prompts", async (req, res) => {
    const projectId = Number(req.query.projectId) || 1;
    try {
      const prompts = await getProjectPrompts(projectId);
      res.json({ ok: true, prompts });
    } catch (e: any) {
      // Fall back to base prompts — never crash the UI
      res.json({ ok: true, prompts: BASE_PROMPTS });
    }
  });

  /* POST /api/chat/answer  { runId, questionId, answer } */
  router.post("/answer", (req, res) => {
    const { runId, questionId, answer } = req.body ?? {};
    if (!runId || !questionId || !answer) {
      res.status(400).json({ ok: false, error: "runId, questionId, and answer are required" });
      return;
    }
    const resolved = resolveQuestion(String(runId), String(questionId), String(answer));
    if (!resolved) {
      res.status(404).json({ ok: false, error: "No pending question found for this runId/questionId" });
      return;
    }
    res.json({ ok: true, answer });
  });

  return router;
}
