import { spawn } from "child_process";
import { getProjectDir } from "../../infrastructure/sandbox/sandbox.util.ts";
import type { Tool, ToolContext, ToolResult } from "../types.ts";

function runCmd(cmd: string, args: string[], cwd: string, signal?: AbortSignal): Promise<{ ok: boolean; stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    const proc = spawn(cmd, args, { cwd, shell: false, env: { ...process.env } });
    proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });
    signal?.addEventListener("abort", () => proc.kill("SIGKILL"));
    proc.on("close", (code) => resolve({ ok: code === 0, stdout: stdout.slice(0, 5000), stderr: stderr.slice(0, 2000), exitCode: code ?? 1 }));
    proc.on("error", (e) => resolve({ ok: false, stdout: "", stderr: e.message, exitCode: 1 }));
  });
}

export const dbMigrate: Tool = {
  name: "db_migrate",
  description: "Run database migrations for the project (supports drizzle-kit, prisma, knex, sequelize auto-detected from package.json).",
  parameters: {
    type: "object",
    properties: {
      tool:    { type: "string", enum: ["drizzle", "prisma", "knex", "sequelize"], description: "Migration tool to use (auto-detected if omitted)" },
      command: { type: "string", description: "Migration sub-command (e.g. migrate, push, generate) — tool-specific" },
    },
  },
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    const projectDir  = getProjectDir(ctx.projectId);
    const toolName    = (args.tool as string) || "drizzle";
    const subCommand  = (args.command as string) || (toolName === "drizzle" ? "push" : "migrate");

    const commandMap: Record<string, [string, string[]]> = {
      drizzle:   ["npx", ["drizzle-kit", subCommand, "--config=drizzle.config.ts"]],
      prisma:    ["npx", ["prisma", subCommand]],
      knex:      ["npx", ["knex", subCommand]],
      sequelize: ["npx", ["sequelize-cli", "db:migrate"]],
    };

    const [cmd, cmdArgs] = commandMap[toolName] || ["npx", ["drizzle-kit", subCommand]];
    const { ok, stdout, stderr, exitCode } = await runCmd(cmd, cmdArgs, projectDir, ctx.signal);
    return { ok, result: { tool: toolName, command: subCommand, stdout, stderr, exitCode }, error: ok ? undefined : stderr.slice(0, 500) };
  },
};

export const dbSeed: Tool = {
  name: "db_seed",
  description: "Run a database seed script to populate the database with initial or test data.",
  parameters: {
    type: "object",
    properties: {
      script: { type: "string", description: "Path to seed script (default: scripts/seed.ts or db/seed.ts)" },
    },
  },
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    const projectDir = getProjectDir(ctx.projectId);
    const script     = (args.script as string) || "scripts/seed.ts";
    const { ok, stdout, stderr, exitCode } = await runCmd("npx", ["tsx", script], projectDir, ctx.signal);
    return { ok, result: { script, stdout, stderr, exitCode }, error: ok ? undefined : stderr.slice(0, 500) };
  },
};

export const dbQuery: Tool = {
  name: "db_query",
  description: "Run a raw SQL query against the project's database. Only works for projects using PostgreSQL + drizzle.",
  parameters: {
    type: "object",
    properties: {
      sql:    { type: "string", description: "SQL statement to execute" },
      params: { type: "array",  items: { type: "string" }, description: "Parameterized values" },
    },
    required: ["sql"],
  },
  async run(args, ctx: ToolContext): Promise<ToolResult> {
    const sql = args.sql as string;
    if (!/^(select|show|describe|explain)/i.test(sql.trim())) {
      return { ok: false, error: "Only SELECT/SHOW/DESCRIBE/EXPLAIN queries are allowed via this tool for safety." };
    }
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) return { ok: false, error: "DATABASE_URL not configured." };
    const { ok, stdout, stderr, exitCode } = await runCmd("psql", [dbUrl, "-c", sql], getProjectDir(ctx.projectId), ctx.signal);
    return { ok, result: { stdout, stderr, exitCode }, error: ok ? undefined : stderr.slice(0, 500) };
  },
};
