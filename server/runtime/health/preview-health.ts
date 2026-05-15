/**
 * preview-health.ts
 *
 * Check whether the project preview URL is publicly reachable.
 *
 * Ownership: runtime/health — single responsibility: preview URL reachability.
 * Distinct from port-probe: this checks the proxied public URL (Replit domain),
 * not the raw local port.
 */

import { runtimeManager } from "../../infrastructure/runtime/runtime-manager.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PreviewHealthResult {
  url:       string;
  reachable: boolean;
  statusCode?: number;
  latencyMs: number;
  error?:    string;
}

// ─── Health check ─────────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 6_000;

export async function checkPreviewHealth(projectId: number): Promise<PreviewHealthResult> {
  const url = runtimeManager.previewUrl(projectId);
  const start = Date.now();

  // Local-only environments (no REPLIT_DEV_DOMAIN) skip the public probe
  if (url.includes("localhost:?") || url.endsWith("/?")) {
    return { url, reachable: false, latencyMs: 0, error: "no_port_assigned" };
  }

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(url, { method: "GET", signal: ctrl.signal, redirect: "follow" });
    clearTimeout(timer);

    const reachable = res.status < 500;
    return { url, reachable, statusCode: res.status, latencyMs: Date.now() - start };
  } catch (err: any) {
    return {
      url,
      reachable:  false,
      latencyMs:  Date.now() - start,
      error:      err?.name === "AbortError" ? "timeout" : (err?.message ?? String(err)),
    };
  }
}
