/**
 * port-probe.ts
 *
 * HTTP probe: determine if a local port is accepting connections and
 * returning a non-5xx response.
 *
 * Ownership: runtime/health — single responsibility: port reachability.
 * No bus, no LLM, pure async I/O.
 */

import http from "http";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProbeResult {
  reachable:  boolean;
  statusCode?: number;
  latencyMs:  number;
  error?:     string;
}

// ─── Probe ────────────────────────────────────────────────────────────────────

const PROBE_TIMEOUT_MS = 4_000;

/**
 * Probe http://localhost:{port}/ with a GET request.
 * Considers 1xx–4xx as "reachable" (server is up, even if returning 404).
 * 5xx and connection errors are "not reachable".
 */
export function probePort(port: number): Promise<ProbeResult> {
  return new Promise((resolve) => {
    const start = Date.now();

    const req = http.request(
      { host: "127.0.0.1", port, path: "/", method: "GET", timeout: PROBE_TIMEOUT_MS },
      (res) => {
        res.resume(); // drain body
        const reachable = (res.statusCode ?? 500) < 500;
        resolve({ reachable, statusCode: res.statusCode, latencyMs: Date.now() - start });
      },
    );

    req.on("timeout", () => {
      req.destroy();
      resolve({ reachable: false, latencyMs: Date.now() - start, error: "timeout" });
    });

    req.on("error", (err) => {
      resolve({ reachable: false, latencyMs: Date.now() - start, error: err.message });
    });

    req.end();
  });
}

/**
 * Retry probe up to `attempts` times with `delayMs` between tries.
 * Returns the first successful probe, or the last failed one.
 */
export async function probePortWithRetry(
  port: number,
  attempts = 3,
  delayMs  = 1_500,
): Promise<ProbeResult> {
  let last: ProbeResult = { reachable: false, latencyMs: 0, error: "not attempted" };
  for (let i = 0; i < attempts; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, delayMs));
    last = await probePort(port);
    if (last.reachable) return last;
  }
  return last;
}
