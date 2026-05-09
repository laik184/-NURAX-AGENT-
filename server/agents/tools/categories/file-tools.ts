import fs from "fs/promises";
import path from "path";
import { getProjectDir, resolveSafe } from "../../../infrastructure/sandbox/sandbox.util.ts";
import type { Tool, ToolContext, ToolResult } from "../types.ts";

async function buildTree(dir: string, maxDepth: number, depth = 0): Promise<string[]> {
  if (depth >= maxDepth) return [];
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  const lines: string[] = [];
  for (const e of entries) {
    if (e.name.startsWith(".") && depth === 0) continue;
    if (["node_modules", ".git", "dist", ".cache"].includes(e.name)) continue;
    const indent = "  ".repeat(depth);
    if (e.isDirectory()) {
      lines.push(`${indent}${e.name}/`);
      lines.push(...await buildTree(path.join(dir, e.name), maxDepth, depth + 1));
    } else {
      lines.push(`${indent}${e.name}`);
    }
  }
  return lines;
}

export const fileList: Tool = {
  name: "file_list",
  description: "List the directory tree of the project sandbox.",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "Subdirectory to list (default: project root)" },
      maxDepth: { type: "number", description: "Max depth (default 4)" },
    },
  },
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    const projectDir = getProjectDir(ctx.projectId);
    const subPath = (args.path as string) || ".";
    const maxDepth = (args.maxDepth as number) || 4;
    try {
      const targetDir = resolveSafe(projectDir, subPath);
      const tree = await buildTree(targetDir, maxDepth);
      return { ok: true, result: { path: subPath, tree: tree.join("\n"), count: tree.length } };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  },
};

export const fileRead: Tool = {
  name: "file_read",
  description: "Read the contents of a file in the project sandbox.",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "Relative file path" },
      offset: { type: "number", description: "Start line (1-indexed, optional)" },
      limit: { type: "number", description: "Max lines to read (optional)" },
    },
    required: ["path"],
  },
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    const projectDir = getProjectDir(ctx.projectId);
    try {
      const abs = resolveSafe(projectDir, args.path as string);
      let content = await fs.readFile(abs, "utf-8");
      if (args.offset || args.limit) {
        const lines = content.split("\n");
        const start = ((args.offset as number) || 1) - 1;
        const end = args.limit ? start + (args.limit as number) : lines.length;
        content = lines.slice(start, end).join("\n");
      }
      const stat = await fs.stat(abs);
      return { ok: true, result: { path: args.path, content, size: stat.size } };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  },
};

export const fileWrite: Tool = {
  name: "file_write",
  description: "Create or overwrite a file in the project sandbox.",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "Relative file path" },
      content: { type: "string", description: "File content" },
    },
    required: ["path", "content"],
  },
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    const projectDir = getProjectDir(ctx.projectId);
    try {
      const abs = resolveSafe(projectDir, args.path as string);
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, args.content as string, "utf-8");
      const stat = await fs.stat(abs);
      return { ok: true, result: { path: args.path, size: stat.size, written: true } };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  },
};

export const fileDelete: Tool = {
  name: "file_delete",
  description: "Delete a file or directory in the project sandbox.",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "Relative file or directory path" },
    },
    required: ["path"],
  },
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    const projectDir = getProjectDir(ctx.projectId);
    try {
      const abs = resolveSafe(projectDir, args.path as string);
      await fs.rm(abs, { recursive: true, force: true });
      return { ok: true, result: { path: args.path, deleted: true } };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  },
};
