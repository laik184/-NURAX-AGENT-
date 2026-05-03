import { projectRunner } from "../../services/project-runner.service.ts";
import type { Tool } from "../types.ts";

export const serverStart: Tool = {
  name: "server_start",
  description:
    "Start the project's dev server (auto-detects npm run dev / start, otherwise serves statically). Returns the assigned port and the public preview URL.",
  parameters: { type: "object", properties: {} },
  async run(_args, ctx) {
    const meta = await projectRunner.start(ctx.projectId);
    return {
      ok: true,
      result: { port: meta.port, status: meta.status, previewPath: `/preview/${ctx.projectId}/` },
    };
  },
};

export const serverStop: Tool = {
  name: "server_stop",
  description: "Stop the project's dev server.",
  parameters: { type: "object", properties: {} },
  async run(_args, ctx) {
    await projectRunner.stop(ctx.projectId);
    return { ok: true, result: { stopped: true } };
  },
};

export const serverRestart: Tool = {
  name: "server_restart",
  description: "Restart the project's dev server (use after writing files).",
  parameters: { type: "object", properties: {} },
  async run(_args, ctx) {
    await projectRunner.stop(ctx.projectId).catch(() => undefined);
    const meta = await projectRunner.start(ctx.projectId);
    return { ok: true, result: { port: meta.port, status: meta.status, previewPath: `/preview/${ctx.projectId}/` } };
  },
};

export const serverLogs: Tool = {
  name: "server_logs",
  description: "Get the last N lines of the dev server's stdout/stderr. Use to find runtime errors.",
  parameters: {
    type: "object",
    properties: { tail: { type: "number", description: "Lines to return. Default 100." } },
  },
  async run(args, ctx) {
    const tail = typeof args.tail === "number" ? args.tail : 100;
    const meta = projectRunner.get(ctx.projectId);
    if (!meta) return { ok: true, result: { lines: [], note: "server not started" } };
    return {
      ok: true,
      result: { status: meta.status, port: meta.port, lines: meta.lastLines.slice(-tail) },
    };
  },
};

export const SERVER_LIFECYCLE_TOOLS: readonly Tool[] = Object.freeze([
  serverStart, serverStop, serverRestart, serverLogs,
]);
