/**
 * server/api/tools.routes.ts
 *
 * HTTP API for the unified tool registry.
 *
 * GET  /api/tools              — list all registered tools
 * GET  /api/tools/stats        — registry metrics + per-tool counters
 * GET  /api/tools/:name        — single tool detail + metrics
 * GET  /api/tools/category/:cat — tools in a given category
 * GET  /api/tools/audit        — recent audit log
 */

import { Router, type Request, type Response } from "express";
import "../tools/index.ts";
import { unifiedRegistry } from "../tools/registry/tool-registry.ts";
import { getAuditLog }     from "../tools/registry/tool-security.ts";
import type { ToolCategory } from "../tools/registry/tool-types.ts";

export function createToolsRouter(): Router {
  const router = Router();

  // ── List all tools ─────────────────────────────────────────────────────────
  router.get("/", (_req: Request, res: Response) => {
    res.json({
      ok:    true,
      total: unifiedRegistry.totalCount,
      tools: unifiedRegistry.list(),
    });
  });

  // ── Registry stats ─────────────────────────────────────────────────────────
  router.get("/stats", (_req: Request, res: Response) => {
    res.json({ ok: true, stats: unifiedRegistry.getStats() });
  });

  // ── Audit log ──────────────────────────────────────────────────────────────
  router.get("/audit", (req: Request, res: Response) => {
    const limit = Number(req.query.limit) || 50;
    res.json({ ok: true, entries: getAuditLog(limit) });
  });

  // ── Tools by category ──────────────────────────────────────────────────────
  router.get("/category/:cat", (req: Request, res: Response) => {
    const cat = req.params.cat as ToolCategory;
    const entries = unifiedRegistry.getByCategory(cat);
    if (!entries.length) {
      res.status(404).json({ ok: false, error: `No tools found for category: ${cat}` });
      return;
    }
    res.json({
      ok:       true,
      category: cat,
      count:    entries.length,
      tools:    entries.map((e) => ({
        name:        e.tool.name,
        description: e.tool.description,
        terminal:    e.terminal,
        permissions: e.permissions,
        metrics:     unifiedRegistry.getMetrics(e.tool.name),
      })),
    });
  });

  // ── Single tool detail ─────────────────────────────────────────────────────
  router.get("/:name", (req: Request, res: Response) => {
    const entry = unifiedRegistry.getEntry(req.params.name);
    if (!entry) {
      res.status(404).json({ ok: false, error: `Tool not found: ${req.params.name}` });
      return;
    }
    res.json({
      ok:          true,
      name:        entry.tool.name,
      category:    entry.category,
      description: entry.tool.description,
      terminal:    entry.terminal,
      permissions: entry.permissions,
      parameters:  entry.tool.parameters,
      metrics:     unifiedRegistry.getMetrics(entry.tool.name),
    });
  });

  return router;
}
