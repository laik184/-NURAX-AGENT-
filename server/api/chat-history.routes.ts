import { Router } from "express";
import { db } from "../infrastructure/db/index.ts";
import { agentRuns, chatMessages } from "../../shared/schema.ts";
import { eq, desc } from "drizzle-orm";

function relativeTime(date: Date | null): string {
  if (!date) return "";
  const diff  = Date.now() - date.getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 2)  return "just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 2)  return "Yesterday";
  if (days  < 7)  return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export function createChatHistoryRouter(): Router {
  const router = Router();

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

  router.get("/session/:runId", async (req, res) => {
    const { runId } = req.params;
    if (!runId) {
      return res.status(400).json({ ok: false, error: "runId required" });
    }
    try {
      const msgs = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.runId, runId))
        .orderBy(chatMessages.createdAt)
        .limit(500);

      res.json({ ok: true, messages: msgs, runId });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e?.message ?? String(e) });
    }
  });

  return router;
}
