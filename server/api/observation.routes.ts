/**
 * observation.routes.ts
 *
 * HTTP API for querying the runtime observation layer.
 *
 * GET /api/observation/:projectId        — current observation state + recent analysis
 * GET /api/observation/:projectId/verify — run an on-demand startup verification
 * GET /api/observation                   — list all currently observed projects
 *
 * Ownership: api/ — routing only. All logic delegates to server/runtime/.
 */

import { Router, type Request, type Response } from "express";
import { observationController } from "../runtime/index.ts";
import { verifyStartup }          from "../runtime/verification/startup-verifier.ts";
import { emitVerificationResult } from "../runtime/feedback/feedback-emitter.ts";
import { runtimeManager }         from "../infrastructure/runtime/runtime-manager.ts";
import { logBuffer, analyzeLines } from "../runtime/index.ts";

export function createObservationRouter(): Router {
  const r = Router();

  // ── List all observed projects ─────────────────────────────────────────────

  r.get("/", (_req: Request, res: Response) => {
    const projectIds = observationController.observedProjects();
    res.json({ ok: true, observedProjects: projectIds, count: projectIds.length });
  });

  // ── Current observation state for a project ────────────────────────────────

  r.get("/:projectId", (req: Request, res: Response) => {
    const projectId = Number(req.params.projectId);
    if (isNaN(projectId)) {
      res.status(400).json({ ok: false, error: "Invalid projectId" });
      return;
    }

    const entry     = runtimeManager.get(projectId);
    const tailLines = logBuffer.tail(projectId, 50);
    const analysis  = analyzeLines(tailLines);

    res.json({
      ok: true,
      projectId,
      runtime: entry
        ? { status: entry.status, port: entry.port, pid: entry.pid, uptimeMs: entry.uptimeMs }
        : { status: "stopped" },
      isObserved: observationController.isObserving(projectId),
      analysis: {
        hasErrors:        analysis.hasErrors,
        hasFatalError:    analysis.hasFatalError,
        hasSuccessSignal: analysis.hasSuccessSignal,
        errorCount:       analysis.errors.length,
        recentErrors:     analysis.errors.slice(-5).map(e => ({
          type:     e.type,
          severity: e.severity,
          line:     e.line.slice(0, 200),
        })),
      },
      recentLogLines: tailLines.slice(-20).map(l => ({ stream: l.stream, text: l.text })),
    });
  });

  // ── On-demand verification for a project ──────────────────────────────────

  r.post("/:projectId/verify", async (req: Request, res: Response) => {
    const projectId = Number(req.params.projectId);
    if (isNaN(projectId)) {
      res.status(400).json({ ok: false, error: "Invalid projectId" });
      return;
    }

    const entry = runtimeManager.get(projectId);
    if (!entry || entry.status !== "running") {
      res.status(409).json({ ok: false, error: "No running server for this project" });
      return;
    }

    try {
      const result = await verifyStartup(projectId, entry.port);
      emitVerificationResult(result);
      res.json({ ok: true, verification: result });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message ?? String(err) });
    }
  });

  return r;
}
