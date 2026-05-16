import { getProjectDir, resolveSafe } from "../../infrastructure/sandbox/sandbox.util.ts";
import { emitFileChange }               from "../../infrastructure/events/file-change-emitter.ts";
import fs from "fs/promises";
import type { Tool, ToolContext, ToolResult } from "../types.ts";

const AUTH_TEMPLATES: Record<string, string> = {
  "session-express": `import session from "express-session";

export const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || "change-me-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === "production", httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 },
});
`,
  "jwt-verify": `import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    (req as any).user = jwt.verify(token, process.env.JWT_SECRET || "change-me");
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}
`,
  "bcrypt-hash": `import bcrypt from "bcryptjs";

const ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
`,
};

export const authScaffold: Tool = {
  name: "auth_scaffold",
  description: "Generate and write an authentication helper file into the project. Supports session-express, jwt-verify, or bcrypt-hash templates.",
  parameters: {
    type: "object",
    properties: {
      template: { type: "string", enum: ["session-express", "jwt-verify", "bcrypt-hash"], description: "Auth helper template to generate" },
      output:   { type: "string", description: "Output path relative to project root (e.g. src/lib/auth.ts)" },
    },
    required: ["template", "output"],
  },
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    const projectDir = getProjectDir(ctx.projectId);
    const template   = args.template as string;
    const output     = args.output as string;
    const content    = AUTH_TEMPLATES[template];
    if (!content) return { ok: false, error: `Unknown template: ${template}. Choose from: ${Object.keys(AUTH_TEMPLATES).join(", ")}` };
    try {
      const abs = resolveSafe(projectDir, output);
      await fs.mkdir(abs.split("/").slice(0, -1).join("/"), { recursive: true });
      await fs.writeFile(abs, content, "utf-8");
      emitFileChange(ctx.projectId, "add", output);
      return { ok: true, result: { template, path: output, message: `Auth helper written to ${output}` } };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  },
};

export const authAudit: Tool = {
  name: "auth_audit",
  description: "Scan project files for common authentication anti-patterns: hardcoded secrets, missing auth middleware, or insecure cookie settings.",
  parameters: { type: "object", properties: {} },
  async run(_args, ctx: ToolContext): Promise<ToolResult> {
    const projectDir = getProjectDir(ctx.projectId);
    const findings: Array<{ severity: string; file: string; issue: string }> = [];

    async function scanDir(dir: string): Promise<void> {
      const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
      for (const e of entries) {
        if (["node_modules", ".git", "dist"].includes(e.name)) continue;
        const full = `${dir}/${e.name}`;
        if (e.isDirectory()) {
          await scanDir(full);
          continue;
        }
        if (!/\.(ts|js|tsx|jsx)$/.test(e.name)) continue;
        try {
          const src = await fs.readFile(full, "utf-8");
          const rel = full.replace(projectDir + "/", "");
          if (/secret\s*[:=]\s*["'`][^"'`]{6,}["'`]/i.test(src)) findings.push({ severity: "high", file: rel, issue: "Hardcoded secret detected" });
          if (/httpOnly\s*:\s*false/i.test(src)) findings.push({ severity: "medium", file: rel, issue: "Cookie httpOnly set to false" });
          if (/secure\s*:\s*false/i.test(src)) findings.push({ severity: "medium", file: rel, issue: "Cookie secure flag set to false" });
          if (/password.*=.*req\.body/i.test(src) && !/bcrypt|argon|pbkdf2|scrypt/i.test(src)) {
            findings.push({ severity: "high", file: rel, issue: "Password from req.body — no hashing detected in this file" });
          }
        } catch { /* skip */ }
      }
    }

    await scanDir(projectDir);
    return { ok: true, result: { findings, total: findings.length, message: findings.length === 0 ? "No obvious auth issues found." : `${findings.length} issue(s) found.` } };
  },
};
