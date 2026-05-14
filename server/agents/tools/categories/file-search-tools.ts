import fs from "fs/promises";
import path from "path";
import { getProjectDir, resolveSafe } from "../../../infrastructure/sandbox/sandbox.util.ts";
import { emitFileChange } from "../../../infrastructure/events/file-change-emitter.ts";
import type { Tool, ToolContext, ToolResult } from "../types.ts";

async function walkFiles(dir: string, glob?: string): Promise<string[]> {
  const files: string[] = [];
  async function walk(current: string): Promise<void> {
    const entries = await fs.readdir(current, { withFileTypes: true }).catch(() => []);
    for (const e of entries) {
      if (["node_modules", ".git", "dist", ".cache", ".data"].includes(e.name)) continue;
      const full = path.join(current, e.name);
      if (e.isDirectory()) {
        await walk(full);
      } else {
        if (!glob || e.name.match(glob.replace(/\*/g, ".*").replace(/\?/g, "."))) {
          files.push(full);
        }
      }
    }
  }
  await walk(dir);
  return files;
}

export const fileSearch: Tool = {
  name: "file_search",
  description: "Search across project files using a regex pattern. Returns matching lines with file and line number.",
  parameters: {
    type: "object",
    properties: {
      pattern:       { type: "string",  description: "Regex pattern to search for" },
      path:          { type: "string",  description: "Subdirectory to search in (default: root)" },
      glob:          { type: "string",  description: "File glob filter e.g. '*.ts'" },
      maxResults:    { type: "number",  description: "Max results (default 50)" },
      caseSensitive: { type: "boolean", description: "Case sensitive (default false)" },
    },
    required: ["pattern"],
  },
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    const projectDir = getProjectDir(ctx.projectId);
    const searchDir  = args.path ? resolveSafe(projectDir, args.path as string) : projectDir;
    const maxResults = (args.maxResults as number) || 50;
    const flags      = args.caseSensitive ? "g" : "gi";
    let regex: RegExp;
    try {
      regex = new RegExp(args.pattern as string, flags);
    } catch (e: any) {
      return { ok: false, error: `Invalid regex: ${e.message}` };
    }
    const files = await walkFiles(searchDir, args.glob as string | undefined);
    const matches: Array<{ file: string; line: number; content: string }> = [];
    for (const file of files) {
      if (matches.length >= maxResults) break;
      try {
        const content = await fs.readFile(file, "utf-8");
        const lines   = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          if (regex.test(lines[i])) {
            matches.push({
              file:    path.relative(projectDir, file),
              line:    i + 1,
              content: lines[i].slice(0, 200),
            });
            regex.lastIndex = 0;
            if (matches.length >= maxResults) break;
          }
          regex.lastIndex = 0;
        }
      } catch { /* skip unreadable */ }
    }
    return { ok: true, result: { count: matches.length, truncated: matches.length >= maxResults, matches } };
  },
};

export const fileReplace: Tool = {
  name: "file_replace",
  description: "Precisely replace a string in a file. Prefer over file_write for targeted edits.",
  parameters: {
    type: "object",
    properties: {
      path:        { type: "string",  description: "Relative file path" },
      old_string:  { type: "string",  description: "Exact string to find and replace" },
      new_string:  { type: "string",  description: "Replacement string" },
      replace_all: { type: "boolean", description: "Replace all occurrences (default false)" },
    },
    required: ["path", "old_string", "new_string"],
  },
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    const projectDir = getProjectDir(ctx.projectId);
    try {
      const abs      = resolveSafe(projectDir, args.path as string);
      const original = await fs.readFile(abs, "utf-8");
      const old      = args.old_string as string;
      const neu      = args.new_string as string;
      if (!original.includes(old)) {
        return { ok: false, error: `old_string not found in ${args.path}` };
      }
      const replaced = args.replace_all
        ? original.split(old).join(neu)
        : original.replace(old, neu);
      const count = args.replace_all
        ? original.split(old).length - 1
        : 1;
      await fs.writeFile(abs, replaced, "utf-8");
      emitFileChange(ctx.projectId, "change", args.path as string);
      return { ok: true, result: { path: args.path, replacements: count } };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  },
};
