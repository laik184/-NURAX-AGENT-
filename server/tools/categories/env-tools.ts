import path from "node:path";
import fs from "node:fs/promises";
import { resolveInSandbox, ensureProjectDir } from "../../infrastructure/sandbox/sandbox.util.ts";
import type { Tool } from "../types.ts";
import { asString } from "../util.ts";

function parseEnv(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val    = trimmed.slice(eq + 1).trim();
    // Strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    result[key] = val;
  }
  return result;
}

function serializeEnv(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([k, v]) => (v.includes(" ") || v.includes("=") || v.includes('"') ? `${k}="${v.replace(/"/g, '\\"')}"` : `${k}=${v}`))
    .join("\n") + "\n";
}

export const envRead: Tool = {
  name: "env_read",
  description:
    "Read environment variables from the project's .env file. Returns all key-value pairs. Use before env_write to see existing variables.",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: ".env file path relative to project root. Default '.env'." },
    },
  },
  async run(args, ctx) {
    await ensureProjectDir(ctx.projectId);
    const envPath = typeof args.path === "string" ? args.path : ".env";
    const abs     = resolveInSandbox(ctx.projectId, envPath);

    let raw: string;
    try {
      raw = await fs.readFile(abs, "utf-8");
    } catch {
      return { ok: true, result: { path: envPath, vars: {}, note: ".env file does not exist yet." } };
    }

    const vars = parseEnv(raw);
    // Mask secret-looking values for safety
    const masked: Record<string, string> = {};
    for (const [k, v] of Object.entries(vars)) {
      const isSecret = /key|secret|token|password|pass|pw|api|auth/i.test(k);
      masked[k] = isSecret && v.length > 4 ? `${v.slice(0, 2)}${"*".repeat(Math.min(v.length - 2, 8))}` : v;
    }

    return { ok: true, result: { path: envPath, vars: masked, count: Object.keys(vars).length } };
  },
};

export const envWrite: Tool = {
  name: "env_write",
  description:
    "Set or update a single key in the project's .env file. Creates the file if it doesn't exist. Existing keys are updated in place; new keys are appended.",
  parameters: {
    type: "object",
    properties: {
      key:   { type: "string", description: "Environment variable name (e.g. DATABASE_URL)." },
      value: { type: "string", description: "Value to set." },
      path:  { type: "string", description: ".env file path relative to project root. Default '.env'." },
    },
    required: ["key", "value"],
  },
  async run(args, ctx) {
    const key      = asString(args.key,   "key");
    const value    = asString(args.value, "value");
    const envPath  = typeof args.path === "string" ? args.path : ".env";

    await ensureProjectDir(ctx.projectId);
    const abs = resolveInSandbox(ctx.projectId, envPath);

    let existing: Record<string, string> = {};
    try {
      const raw = await fs.readFile(abs, "utf-8");
      existing  = parseEnv(raw);
    } catch { /* file didn't exist */ }

    const isNew    = !(key in existing);
    existing[key]  = value;

    await fs.writeFile(abs, serializeEnv(existing), "utf-8");

    return {
      ok: true,
      result: { path: envPath, key, action: isNew ? "created" : "updated", totalKeys: Object.keys(existing).length },
    };
  },
};

export const ENV_TOOLS: readonly Tool[] = Object.freeze([envRead, envWrite]);
