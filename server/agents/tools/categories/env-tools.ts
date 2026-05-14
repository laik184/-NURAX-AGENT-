import fs from "fs/promises";
import path from "path";
import { getProjectDir } from "../../../infrastructure/sandbox/sandbox.util.ts";
import { emitFileChange } from "../../../infrastructure/events/file-change-emitter.ts";
import type { Tool, ToolContext, ToolResult } from "../types.ts";

function parseEnv(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

const SECRET_PATTERNS = /key|secret|password|token|auth|api/i;

function maskSecrets(env: Record<string, string>): Record<string, string> {
  const masked: Record<string, string> = {};
  for (const [k, v] of Object.entries(env)) {
    masked[k] = SECRET_PATTERNS.test(k) ? `${v.slice(0, 4)}${"*".repeat(Math.max(0, v.length - 4))}` : v;
  }
  return masked;
}

export const envRead: Tool = {
  name: "env_read",
  description: "Read .env file key-value pairs from the project. Secrets are automatically masked.",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "Path to .env file (default: .env)" },
    },
  },
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    const projectDir = getProjectDir(ctx.projectId);
    const envPath = path.join(projectDir, (args.path as string) || ".env");
    try {
      const content = await fs.readFile(envPath, "utf-8");
      const env = parseEnv(content);
      const masked = maskSecrets(env);
      return { ok: true, result: { path: args.path || ".env", count: Object.keys(env).length, env: masked } };
    } catch (e: any) {
      if (e.code === "ENOENT") {
        return { ok: true, result: { path: args.path || ".env", count: 0, env: {}, message: ".env file does not exist yet." } };
      }
      return { ok: false, error: e.message };
    }
  },
};

export const envWrite: Tool = {
  name: "env_write",
  description: "Set or update a key in the project .env file. Creates the file if it doesn't exist. Never log the value.",
  parameters: {
    type: "object",
    properties: {
      key: { type: "string", description: "Environment variable key" },
      value: { type: "string", description: "Value to set" },
      path: { type: "string", description: "Path to .env file (default: .env)" },
    },
    required: ["key", "value"],
  },
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    const projectDir = getProjectDir(ctx.projectId);
    const envPath = path.join(projectDir, (args.path as string) || ".env");
    const key = args.key as string;
    const value = args.value as string;
    try {
      let content = "";
      try { content = await fs.readFile(envPath, "utf-8"); } catch { /* new file */ }
      const lines = content ? content.split("\n") : [];
      const keyRe = new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=`);
      const idx = lines.findIndex((l) => keyRe.test(l.trim()));
      const newLine = `${key}="${value}"`;
      if (idx !== -1) {
        lines[idx] = newLine;
      } else {
        if (lines.length > 0 && lines[lines.length - 1] !== "") lines.push("");
        lines.push(newLine);
      }
      await fs.writeFile(envPath, lines.join("\n"), "utf-8");
      emitFileChange(ctx.projectId, "change", (args.path as string) || ".env");
      return { ok: true, result: { key, set: true, path: args.path || ".env" } };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  },
};
