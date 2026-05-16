/**
 * server/tools/categories/server-lifecycle-tools.ts
 *
 * AI agent tools for starting, stopping, restarting, and inspecting
 * the project dev server. ALL process operations delegate to runtimeManager.
 */

import { runtimeManager }        from "../../infrastructure/runtime/runtime-manager.ts";
import { verifyStartup }          from "../../runtime/verification/startup-verifier.ts";
import { emitVerificationResult } from "../../runtime/feedback/feedback-emitter.ts";
import type { Tool, ToolContext, ToolResult } from "../types.ts";

export const serverStart: Tool = {
  name: "server_start",
  description:
    "Start the project dev server. Runs `npm run dev` in the project sandbox " +
    "and automatically verifies startup (log scan + port probe). " +
    "Returns a health verdict so you know whether to proceed or diagnose.",
  parameters: { type: "object", properties: {} },

  async run(_args, ctx: ToolContext): Promise<ToolResult> {
    const result = await runtimeManager.start(ctx.projectId);
    if (!result.ok) return { ok: false, error: result.error };

    if (result.alreadyRunning) {
      return { ok: true, result: { already_running: true, port: result.port, message: `Server already running on port ${result.port}.` } };
    }

    const verification = await verifyStartup(ctx.projectId, result.port!);
    emitVerificationResult(verification);
    const healthy = verification.outcome === "healthy" || verification.outcome === "degraded";

    return {
      ok: healthy,
      result: {
        started:      true,
        port:         result.port,
        pid:          result.pid,
        health:       verification.outcome,
        portProbe:    { reachable: verification.probe.reachable, latencyMs: verification.probe.latencyMs },
        message:      verification.llmSummary,
        logsSnapshot: verification.analysis.errors.slice(0, 3).map((e: any) => e.line),
      },
    };
  },
};

export const serverStop: Tool = {
  name: "server_stop",
  description: "Stop the project dev server.",
  parameters: { type: "object", properties: {} },

  async run(_args, ctx: ToolContext): Promise<ToolResult> {
    if (!runtimeManager.isRunning(ctx.projectId)) {
      return { ok: true, result: { message: "No running server for this project." } };
    }
    const result = runtimeManager.stop(ctx.projectId);
    if (!result.ok) return { ok: false, error: result.error };
    return { ok: true, result: { stopped: true, message: "Dev server stopped." } };
  },
};

export const serverRestart: Tool = {
  name: "server_restart",
  description: "Restart the project dev server. Automatically verifies it comes back up (log scan + port probe).",
  parameters: { type: "object", properties: {} },

  async run(_args, ctx: ToolContext): Promise<ToolResult> {
    const result = await runtimeManager.restart(ctx.projectId);
    if (!result.ok) return { ok: false, error: result.error };

    const verification = await verifyStartup(ctx.projectId, result.port!);
    emitVerificationResult(verification);
    const healthy = verification.outcome === "healthy" || verification.outcome === "degraded";

    return {
      ok: healthy,
      result: {
        restarted:    true,
        port:         result.port,
        pid:          result.pid,
        health:       verification.outcome,
        portProbe:    { reachable: verification.probe.reachable, latencyMs: verification.probe.latencyMs },
        message:      verification.llmSummary,
        logsSnapshot: verification.analysis.errors.slice(0, 3).map((e: any) => e.line),
      },
    };
  },
};

export const serverLogs: Tool = {
  name: "server_logs",
  description: "Get recent dev server stdout/stderr logs.",
  parameters: {
    type: "object",
    properties: {
      tail: { type: "number", description: "Number of recent lines to return (default 50)" },
    },
  },

  async run(args, ctx: ToolContext): Promise<ToolResult> {
    const entry = runtimeManager.get(ctx.projectId);
    if (!entry) {
      return { ok: true, result: { status: "stopped", lines: [], message: "No running server." } };
    }
    const tail = (args.tail as number) || 50;
    return {
      ok: true,
      result: {
        status:   entry.status,
        port:     entry.port,
        pid:      entry.pid,
        lines:    runtimeManager.getLogs(ctx.projectId, tail),
        uptimeMs: entry.uptimeMs,
      },
    };
  },
};
