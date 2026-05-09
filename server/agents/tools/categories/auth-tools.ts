import fs from "fs/promises";
import path from "path";
import { getProjectDir } from "../../../infrastructure/sandbox/sandbox.util.ts";
import type { Tool, ToolContext, ToolResult } from "../types.ts";

export const authLogin: Tool = {
  name: "auth_login",
  description: "Set authentication credentials (API keys, tokens, secrets) in the project .env file securely.",
  parameters: {
    type: "object",
    properties: {
      service: { type: "string", description: "Service name (e.g. 'github', 'openai', 'stripe')" },
      credentials: {
        type: "object",
        description: "Key-value map of credential names to values (e.g. {GITHUB_TOKEN: 'ghp_...'})",
      },
      env_file: { type: "string", description: "Path to .env file (default: .env)" },
    },
    required: ["service", "credentials"],
  },
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    const projectDir = getProjectDir(ctx.projectId);
    const service = args.service as string;
    const credentials = args.credentials as Record<string, string>;
    const envFile = path.join(projectDir, (args.env_file as string) || ".env");

    if (!credentials || typeof credentials !== "object") {
      return { ok: false, error: "credentials must be an object of key-value pairs." };
    }

    try {
      let content = "";
      try { content = await fs.readFile(envFile, "utf-8"); } catch { /* new file */ }
      const lines = content ? content.split("\n") : [];
      const setKeys: string[] = [];

      for (const [key, value] of Object.entries(credentials)) {
        if (!key.match(/^[A-Za-z_][A-Za-z0-9_]*$/)) {
          return { ok: false, error: `Invalid env key: ${key}` };
        }
        const keyRe = new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=`);
        const idx = lines.findIndex((l) => keyRe.test(l.trim()));
        const newLine = `${key}="${String(value)}"`;
        if (idx !== -1) {
          lines[idx] = newLine;
        } else {
          if (lines.length > 0 && lines[lines.length - 1] !== "") lines.push("");
          lines.push(newLine);
        }
        setKeys.push(key);
      }

      await fs.writeFile(envFile, lines.join("\n"), "utf-8");

      return {
        ok: true,
        result: {
          service,
          keysSet: setKeys,
          count: setKeys.length,
          message: `Set ${setKeys.length} credential(s) for ${service} in ${args.env_file || ".env"}`,
        },
      };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  },
};
