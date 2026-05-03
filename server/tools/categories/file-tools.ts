import path from "node:path";
import fs from "node:fs/promises";
import { ensureProjectDir, projectRoot, resolveInSandbox } from "../../sandbox/sandbox.util.ts";
import { bus } from "../../events/bus.ts";
import type { Tool } from "../types.ts";
import { asString, safeJoin } from "../util.ts";

/* ───────── Minimal line-diff engine ───────── */

type DiffLineType = "add" | "remove" | "context";
interface DiffLine { type: DiffLineType; content: string; oldLineNo?: number; newLineNo?: number; }

/** Compute a simple LCS-based unified diff between two strings (≤600 lines each). */
function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const MAX = 300;
  if (oldLines.length > MAX || newLines.length > MAX) {
    // For large files just show new content as additions
    return newLines.map((content, i) => ({ type: "add", content, newLineNo: i + 1 }));
  }

  const n = oldLines.length, m = newLines.length;
  // LCS table
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (oldLines[i] === newLines[j]) dp[i][j] = 1 + dp[i + 1][j + 1];
      else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const out: DiffLine[] = [];
  let i = 0, j = 0, oldNo = 1, newNo = 1;
  while (i < n || j < m) {
    if (i < n && j < m && oldLines[i] === newLines[j]) {
      out.push({ type: "context", content: oldLines[i], oldLineNo: oldNo++, newLineNo: newNo++ });
      i++; j++;
    } else if (j < m && (i >= n || dp[i][j + 1] >= dp[i + 1][j])) {
      out.push({ type: "add", content: newLines[j], newLineNo: newNo++ });
      j++;
    } else {
      out.push({ type: "remove", content: oldLines[i], oldLineNo: oldNo++ });
      i++;
    }
  }
  return out;
}

function buildFileDiff(filePath: string, oldContent: string | null, newContent: string) {
  const isNew = oldContent === null;
  const lines: DiffLine[] = isNew
    ? newContent.split("\n").map((content, i) => ({ type: "add" as const, content, newLineNo: i + 1 }))
    : computeDiff(oldContent, newContent);

  const additions = lines.filter((l) => l.type === "add").length;
  const deletions = lines.filter((l) => l.type === "remove").length;
  return {
    filename: filePath,
    status: (isNew ? "created" : "modified") as "created" | "modified" | "deleted",
    additions,
    deletions,
    lines,
  };
}

/* ───────── Tools ───────── */

export const fileList: Tool = {
  name: "file_list",
  description:
    "List files and directories under a path inside the project sandbox. Returns a recursive tree (depth-limited).",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "Path relative to project root. Defaults to '.' (root)." },
      maxDepth: { type: "number", description: "Max recursion depth. Defaults to 3." },
    },
  },
  async run(args, ctx) {
    const rel = (args.path as string) || ".";
    const maxDepth = typeof args.maxDepth === "number" ? args.maxDepth : 3;
    await ensureProjectDir(ctx.projectId);
    const root = projectRoot(ctx.projectId);
    const start = rel === "." ? root : safeJoin(root, rel);
    async function walk(dir: string, depth: number): Promise<unknown> {
      if (depth < 0) return null;
      let entries: import("fs").Dirent[];
      try { entries = await fs.readdir(dir, { withFileTypes: true }); }
      catch (e: any) { return { error: e.message }; }
      const out: Record<string, unknown> = {};
      for (const e of entries) {
        if (e.name === "node_modules" || e.name === ".git" || e.name.startsWith(".")) continue;
        if (e.isDirectory()) out[e.name + "/"] = await walk(path.join(dir, e.name), depth - 1);
        else out[e.name] = "file";
      }
      return out;
    }
    return { ok: true, result: await walk(start, maxDepth) };
  },
};

export const fileRead: Tool = {
  name: "file_read",
  description: "Read a UTF-8 text file from the project sandbox. Returns content as a string.",
  parameters: {
    type: "object",
    properties: { path: { type: "string", description: "Path relative to project root." } },
    required: ["path"],
  },
  async run(args, ctx) {
    const p = asString(args.path, "path");
    const abs = resolveInSandbox(ctx.projectId, p);
    const content = await fs.readFile(abs, "utf-8");
    if (content.length > 200_000) {
      return { ok: true, result: { path: p, truncated: true, content: content.slice(0, 200_000) } };
    }
    return { ok: true, result: { path: p, content } };
  },
};

export const fileWrite: Tool = {
  name: "file_write",
  description:
    "Write (or overwrite) a UTF-8 text file inside the project sandbox. Creates parent directories.",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "Path relative to project root." },
      content: { type: "string", description: "Full file content to write." },
    },
    required: ["path", "content"],
  },
  async run(args, ctx) {
    const p = asString(args.path, "path");
    const content = asString(args.content, "content");
    const abs = resolveInSandbox(ctx.projectId, p);

    // Read old content for diff (best-effort)
    let oldContent: string | null = null;
    try { oldContent = await fs.readFile(abs, "utf-8"); } catch { /* file didn't exist */ }

    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, content, "utf-8");

    const bytes = Buffer.byteLength(content, "utf-8");

    // Emit file.written (existing event for chip display)
    bus.emit("agent.event", {
      runId: ctx.runId,
      eventType: "file.written",
      phase: "tool",
      ts: Date.now(),
      payload: { path: p, bytes },
    });

    // Emit file.diff (new event — renders FileDiffCard in chat)
    const diff = buildFileDiff(p, oldContent, content);
    bus.emit("agent.event", {
      runId: ctx.runId,
      eventType: "file.diff",
      phase: "tool",
      ts: Date.now(),
      payload: { diff },
    });

    bus.emit("file.change", { projectId: ctx.projectId, path: p, kind: "change", ts: Date.now() });
    return { ok: true, result: { path: p, bytes } };
  },
};

export const fileDelete: Tool = {
  name: "file_delete",
  description: "Delete a file or directory (recursive) inside the project sandbox.",
  parameters: {
    type: "object",
    properties: { path: { type: "string" } },
    required: ["path"],
  },
  async run(args, ctx) {
    const p = asString(args.path, "path");
    const abs = resolveInSandbox(ctx.projectId, p);

    // Read for deleted diff (best-effort)
    let oldContent: string | null = null;
    try { oldContent = await fs.readFile(abs, "utf-8"); } catch { /* ignore */ }

    await fs.rm(abs, { recursive: true, force: true });

    if (oldContent !== null) {
      const lines = oldContent.split("\n").map((content, i) => ({
        type: "remove" as const, content, oldLineNo: i + 1,
      }));
      bus.emit("agent.event", {
        runId: ctx.runId,
        eventType: "file.diff",
        phase: "tool",
        ts: Date.now(),
        payload: { diff: { filename: p, status: "deleted", additions: 0, deletions: lines.length, lines } },
      });
    }

    bus.emit("file.change", { projectId: ctx.projectId, path: p, kind: "unlink", ts: Date.now() });
    return { ok: true, result: { path: p, deleted: true } };
  },
};

export const FILE_TOOLS: readonly Tool[] = Object.freeze([fileList, fileRead, fileWrite, fileDelete]);
