/**
 * preview-validator.ts
 *
 * Verify the project preview is reachable via HTTP.
 *
 * Probes the local port assigned to the project server.
 * A 1xx–4xx response is "reachable" (server is up, even if returning 404).
 * 5xx or connection errors → failed.
 *
 * Ownership: verification/preview — HTTP reachability only.
 * Delegates to server/runtime/health/port-probe.
 */

import { runtimeManager }     from "../../infrastructure/runtime/runtime-manager.ts";
import { probePortWithRetry }  from "../../runtime/health/port-probe.ts";
import type { CheckResult }    from "../types.ts";

export async function checkPreviewHttp(projectId: number): Promise<CheckResult> {
  const entry = runtimeManager.get(projectId);

  if (!entry || entry.status !== "running") {
    return {
      name:    "preview_http",
      status:  "skipped",
      message: "No running server — preview HTTP check skipped.",
    };
  }

  const probe = await probePortWithRetry(entry.port, 3, 1_500);

  if (probe.reachable) {
    return {
      name:    "preview_http",
      status:  "passed",
      message: `Preview responding on port ${entry.port} (HTTP ${probe.statusCode ?? "??"}, ${probe.latencyMs}ms).`,
    };
  }

  return {
    name:    "preview_http",
    status:  "failed",
    message: `Preview port ${entry.port} is not responding (${probe.error ?? "connection refused"}).`,
    detail:  `The server process is alive but not accepting HTTP connections. ` +
             `Check server logs for startup errors, then call server_restart.`,
  };
}
