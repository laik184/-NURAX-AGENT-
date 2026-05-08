import path from "node:path";
import fs from "node:fs/promises";
import { ensureProjectDir, projectRoot, resolveInSandbox } from "../../infrastructure/sandbox/sandbox.util.ts";
import { bus } from "../../infrastructure/events/bus.ts";
import type { Tool } from "../types.ts";
import { asString, safeJoin } from "../util.ts";

const TEXT_EXTS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".txt", ".css", ".scss",
  ".html", ".py", ".sh", ".yml", ".yaml", ".env", ".toml", ".rs", ".go",
  ".java", ".c", ".cpp", ".h", ".rb", ".php", ".sql", ".graphql",
]);
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", "coverage", ".cache"]);

type DiffLine = { type: "add" | "remove" | "context"; content: string; oldLineNo?: number; newLineNo?: number };

function simpleDiff(oldText: string, newText: string): DiffLine[] {
  const o = oldText.split("\n"), n = newText.split("\n");
  const out: DiffLine[] = [];
  const dp: number[][] = Array.from({ length: o.length + 1 }, () => new Array(n.length + 1).fill(0));
  for (let i = o.length - 1; i >= 0; i--)
    for (let j = n.length - 1; j >= 0; j--)
      dp[i][j] = o[i] === n[j] ? 1 + dp[i + 1][j + 1] : Math.max(dp[i + 1][j], dp[i][j + 1]);
  let i = 0, j = 0, oi = 1, ni = 1;
  while (i < o.length || j < n.length) {
    if (i < o.length && j < n.length && o[i] === n[j]) { out.push({ type: "context", content: o[i], oldLineNo: oi++, newLineNo: ni++ }); i++; j++; }
    else if (j < n.length && (i >= o.length || dp[i][j + 1] >= dp[i + 1][j])) { out.push({ type: "add", content: n[j], newLineNo: ni++ }); j++; }
    else { out.push({ type: "remove", content: o[i], oldLineNo: oi++ }); i++; }
  }
  return out;
}

export const fileSearch: Tool = {
  name: "file_search",
  description:
    "Search file contents by regex or literal pattern across the project sandbox. Returns matching file paths, line numbers, and content. Use before editing to locate exact strings.",
  parameters: {
    type: "object",
    properties: {
      pattern:       { type: "string",  description: "Regex or literal string to search for." },
      path:          { type: "string",  description: "Sub-directory to search in. Defaults to '.' (project root)." },
      glob:          { type: "string",  description: "File filter e.g. '*.ts', '*.json'. Default: all text files." },
      maxResults:    { type: "number",  description: "Max matching lines to return. Default 50, max 200." },
      caseSensitive: { type: "boolean", description: "Case-sensitive match. Default true." },
    },
    required: ["pattern"],
  },
  async run(args, ctx) {
    const pattern    = asString(args.pattern, "pattern");
    const searchPath = (args.path as string)  || ".";
    const globFilter = (args.glob as string)  || "";
    const maxResults = Math.min(typeof args.maxResults === "number" ? args.maxResults : 50, 200);
    const flags      = args.caseSensitive === false ? "i" : "";

    let regex: RegExp;
    try { regex = new RegExp(pattern, flags); }
    catch (e: any) { return { ok: false, error: `Invalid regex: ${e.message}` }; }

    await ensureProjectDir(ctx.projectId);
    const root  = projectRoot(ctx.projectId);
    const start = searchPath === "." ? root : safeJoin(root, searchPath);

    const results: { file: string; line: number; content: string }[] = [];

    async function walk(dir: string): Promise<void> {
      if (results.length >= maxResults) return;
      let entries: import("fs").Dirent[];
      try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
      for (const e of entries) {
        if (results.length >= maxResults) return;
        if (SKIP_DIRS.has(e.name)) continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) { await walk(full); continue; }
        const ext = path.extname(e.name).toLowerCase();
        if (globFilter) {
          if (globFilter.startsWith("*.") && !e.name.endsWith(globFilter.slice(1))) continue;
          else if (!globFilter.startsWith("*") && !e.name.includes(globFilter)) continue;
        } else if (!TEXT_EXTS.has(ext)) continue;
        try {
          const lines = (await fs.readFile(full, "utf-8")).split("\n");
          const rel   = path.relative(root, full);
          for (let i = 0; i < lines.length && results.length < maxResults; i++) {
            if (regex.test(lines[i])) results.push({ file: rel, line: i + 1, content: lines[i].trim().slice(0, 250) });
          }
        } catch { /* binary / permission */ }
      }
    }

    await walk(start);
    return { ok: true, result: { matches: results, count: results.length, truncated: results.length >= maxResults } };
  },
};

export const fileReplace: Tool = {
  name: "file_replace",
  description:
    "Replace an exact string inside a file (first occurrence by default). More precise than rewriting the entire file — prefer this for small edits. Use file_search first to confirm the exact text.",
  parameters: {
    type: "object",
    properties: {
      path:        { type: "string",  description: "Path relative to project root." },
      old_string:  { type: "string",  description: "Exact text to find (must match whitespace/indentation exactly)." },
      new_string:  { type: "string",  description: "Replacement text." },
      replace_all: { type: "boolean", description: "Replace every occurrence. Default false (first only)." },
    },
    required: ["path", "old_string", "new_string"],
  },
  async run(args, ctx) {
    const p       = asString(args.old_string !== undefined ? args.path as string : "", "path") || asString(args.path, "path");
    const oldStr  = asString(args.old_string, "old_string");
    const newStr  = typeof args.new_string === "string" ? args.new_string : asString(args.new_string, "new_string");
    const all     = args.replace_all === true;
    const abs     = resolveInSandbox(ctx.projectId, asString(args.path, "path"));

    const content = await fs.readFile(abs, "utf-8");
    if (!content.includes(oldStr)) {
      return { ok: false, error: `old_string not found in ${args.path}. Use file_search to locate the exact text (including whitespace).` };
    }

    const newContent   = all ? content.split(oldStr).join(newStr) : content.replace(oldStr, newStr);
    const replacements = all ? content.split(oldStr).length - 1 : 1;
    const filePath     = asString(args.path, "path");

    await fs.writeFile(abs, newContent, "utf-8");

    const diffLines = simpleDiff(content, newContent);
    bus.emit("agent.event", { runId: ctx.runId, eventType: "file.written", phase: "tool", ts: Date.now(), payload: { path: filePath, bytes: Buffer.byteLength(newContent) } });
    bus.emit("agent.event", { runId: ctx.runId, eventType: "file.diff",    phase: "tool", ts: Date.now(),
      payload: { diff: { filename: filePath, status: "modified", additions: diffLines.filter(l => l.type === "add").length, deletions: diffLines.filter(l => l.type === "remove").length, lines: diffLines } },
    });
    bus.emit("file.change", { projectId: ctx.projectId, path: filePath, kind: "change", ts: Date.now() });

    return { ok: true, result: { path: filePath, replacements } };
  },
};

export const FILE_SEARCH_TOOLS: readonly Tool[] = Object.freeze([fileSearch, fileReplace]);
