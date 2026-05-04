import { Router, Request, Response } from "express";
import { promises as fs } from "fs";
import * as path from "path";
import { TOOLS, getTool } from "../tools/registry.ts";
import { bus } from "../events/bus.ts";

/**
 * Inventory & action routes — backend functions powering the chat panel
 * action menus. Every menu click in ChatPanel hits one of these endpoints
 * so the backend stays the single source of truth and can broadcast the
 * action over the existing event bus.
 */

const ROOT = process.cwd();
const AGENTS_MD = path.join(ROOT, "server/agents/AGENTS.md");
const TOOLS_MD = path.join(ROOT, "server/agents/TOOLS.md");

interface ParsedAgent {
  icon: string;
  name: string;
  path: string;
  role: string;
  category: string;
}

interface ParsedTool {
  status: string; // ✅ ❌ ⚠️
  icon: string;
  name: string;
  description: string;
  category: string;
  registered: boolean; // is it actually in TOOLS registry?
}

const TABLE_ROW_RE = /^\|\s*([^|]+?)\s*\|\s*`?([^|`]+?)`?\s*\|\s*`?([^|`]+?)`?\s*\|\s*([^|]*?)\s*\|$/;
const TOOL_ROW_RE = /^\|\s*([✅❌⚠️]+)\s*\|\s*([^|]+?)\s*\|\s*`([^`]+)`\s*\|\s*([^|]+?)\s*\|$/;
const CATEGORY_RE = /^##\s+(.+?)\s*(?:\((\d+)\))?\s*$/;

async function parseAgentsMd(): Promise<ParsedAgent[]> {
  const md = await fs.readFile(AGENTS_MD, "utf8");
  const lines = md.split(/\r?\n/);
  const agents: ParsedAgent[] = [];
  const seen = new Set<string>();
  let category = "Unknown";
  for (const line of lines) {
    const cm = CATEGORY_RE.exec(line);
    if (cm && !line.toLowerCase().includes("summary")) {
      category = cm[1].trim();
      continue;
    }
    const m = TABLE_ROW_RE.exec(line);
    if (!m) continue;
    const [, icon, name, p, role] = m;
    if (icon === "Icon" || icon.startsWith("--") || !p.includes("/")) continue;
    const key = `${name}::${p}`;
    if (seen.has(key)) continue;
    seen.add(key);
    agents.push({
      icon: icon.trim(),
      name: name.replace(/[‑‐]/g, "-").trim(),
      path: p.trim(),
      role: (role || "").trim(),
      category,
    });
  }
  return agents;
}

async function parseToolsMd(): Promise<ParsedTool[]> {
  const md = await fs.readFile(TOOLS_MD, "utf8");
  const lines = md.split(/\r?\n/);
  const tools: ParsedTool[] = [];
  const registeredSet = new Set(TOOLS.map((t) => t.name));
  let category = "Unknown";
  for (const line of lines) {
    const cm = CATEGORY_RE.exec(line);
    if (cm && !line.toLowerCase().includes("summary")) {
      category = cm[1].replace(/^[^A-Za-z]+/, "").trim();
      continue;
    }
    const m = TOOL_ROW_RE.exec(line);
    if (!m) continue;
    const [, status, icon, name, desc] = m;
    tools.push({
      status: status.trim(),
      icon: icon.trim(),
      name: name.trim(),
      description: desc.trim(),
      category,
      registered: registeredSet.has(name.trim()),
    });
  }
  return tools;
}

export function createInventoryRouter(): Router {
  const router = Router();

  // ── Agents inventory ──────────────────────────────────────────────
  router.get("/agents", async (_req: Request, res: Response) => {
    try {
      const agents = await parseAgentsMd();
      const byCategory: Record<string, ParsedAgent[]> = {};
      for (const a of agents) (byCategory[a.category] ??= []).push(a);
      res.json({ ok: true, total: agents.length, byCategory, agents });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ ok: false, error: message });
    }
  });

  router.get("/agents/:slug", async (req: Request, res: Response) => {
    try {
      const slug = req.params.slug;
      const agents = await parseAgentsMd();
      const found = agents.find(
        (a) => a.name === slug || a.path === slug || a.path.endsWith(`/${slug}`),
      );
      if (!found) {
        res.status(404).json({ ok: false, error: `agent not found: ${slug}` });
        return;
      }
      res.json({ ok: true, agent: found });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ ok: false, error: message });
    }
  });

  // ── Tools inventory ───────────────────────────────────────────────
  router.get("/tools", async (_req: Request, res: Response) => {
    try {
      const tools = await parseToolsMd();
      const byCategory: Record<string, ParsedTool[]> = {};
      for (const t of tools) (byCategory[t.category] ??= []).push(t);
      const existing = tools.filter((t) => t.status === "✅").length;
      const missing = tools.filter((t) => t.status === "❌").length;
      res.json({
        ok: true,
        total: tools.length,
        existing,
        missing,
        registered: tools.filter((t) => t.registered).length,
        byCategory,
        tools,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ ok: false, error: message });
    }
  });

  router.get("/tools/:name", async (req: Request, res: Response) => {
    try {
      const name = req.params.name;
      const tools = await parseToolsMd();
      const found = tools.find((t) => t.name === name);
      const live = getTool(name);

      if (!found && !live) {
        res.status(404).json({ ok: false, error: `tool not found: ${name}` });
        return;
      }

      if (!found && live) {
        // Tool is in live registry but not documented in TOOLS.md (e.g. agent_question)
        res.json({
          ok: true,
          tool: {
            status: "✅",
            icon: "🤖",
            name,
            description: live.description,
            category: "Agent Control",
            registered: true,
            parameters: live.parameters,
          },
        });
        return;
      }

      res.json({
        ok: true,
        tool: { ...found, parameters: live?.parameters ?? null },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ ok: false, error: message });
    }
  });

  // ── Tool invocation (registered tools only) ────────────────────────
  router.post("/tools/:name/invoke", async (req: Request, res: Response) => {
    const name = req.params.name;
    const args = (req.body?.args ?? {}) as Record<string, unknown>;
    const projectId = Number(req.body?.projectId ?? req.headers["x-project-id"] ?? 1) || 1;
    const tool = getTool(name);
    if (!tool) {
      res.status(404).json({
        ok: false,
        error: `tool '${name}' is not registered (only ${TOOLS.length} tools have a backend implementation)`,
      });
      return;
    }
    const runId = `inv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    bus.emit("agent.event", {
      runId,
      projectId,
      eventType: "agent.tool_call",
      payload: { tool: name, status: "started", args },
      ts: Date.now(),
    });
    try {
      const exec = await tool.run(args, { projectId, runId });
      bus.emit("agent.event", {
        runId,
        projectId,
        eventType: "agent.tool_call",
        payload: { tool: name, status: exec.ok ? "completed" : "error", result: exec },
        ts: Date.now(),
      });
      res.json({ ok: true, runId, result: exec });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      bus.emit("agent.event", {
        runId,
        projectId,
        eventType: "agent.tool_call",
        payload: { tool: name, status: "error", error: message },
        ts: Date.now(),
      });
      res.status(500).json({ ok: false, runId, error: message });
    }
  });

  // ── User-initiated actions broadcast through the bus ───────────────
  // POST /api/inventory/actions/open-file  { path, projectId? }
  router.post("/actions/open-file", async (req: Request, res: Response) => {
    const filePath = String(req.body?.path ?? "").trim();
    const projectId = Number(req.body?.projectId ?? req.headers["x-project-id"] ?? 1) || 1;
    if (!filePath) {
      res.status(400).json({ ok: false, error: "`path` is required" });
      return;
    }
    bus.emit("agent.event", {
      runId: `user-action-${Date.now()}`,
      projectId,
      eventType: "agent.message",
      payload: { kind: "open-file", path: filePath },
      ts: Date.now(),
    });
    try {
      const abs = path.resolve(ROOT, filePath);
      if (!abs.startsWith(ROOT)) {
        res.status(400).json({ ok: false, error: "path escapes project root" });
        return;
      }
      const content = await fs.readFile(abs, "utf8");
      const ext = path.extname(filePath).slice(1).toLowerCase();
      const lang =
        ({ ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
           json: "json", md: "markdown", css: "css", html: "html", py: "python" } as Record<string, string>)[ext] ||
        "plaintext";
      res.json({ ok: true, path: filePath, content, lang });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(404).json({ ok: false, error: message });
    }
  });

  return router;
}
