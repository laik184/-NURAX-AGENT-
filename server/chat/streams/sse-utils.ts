/**
 * sse-utils.ts
 *
 * Shared SSE primitives used by ALL SSE endpoints in this server.
 * Single source of truth for SSE formatting — no duplicated implementations.
 *
 * Rules enforced here:
 *  - ONE write per event (atomic frame, no partial delivery risk)
 *  - ONE formatting strategy (`event: X\ndata: Y\n\n`)
 *  - ONE heartbeat factory
 */

import type { Request, Response } from "express";

// ─── Setup ────────────────────────────────────────────────────────────────────

/**
 * Initialise an HTTP response as a persistent SSE stream.
 * Must be called exactly once per SSE endpoint, before any events are sent.
 */
export function setupSse(res: Response): void {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();
  res.write(": connected\n\n");
}

// ─── Event Emission ───────────────────────────────────────────────────────────

/**
 * Write a single named SSE event frame.
 *
 * Produces exactly:
 *   event: <name>\n
 *   data: <json>\n
 *   \n
 *
 * One atomic string write prevents partial frame delivery.
 * NEVER call res.write() directly in SSE handlers — use this function.
 */
export function sseSend(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

// ─── Heartbeat ────────────────────────────────────────────────────────────────

/** SSE comment ping — keeps the connection alive through proxies. */
const PING_INTERVAL_MS = 15_000;

/**
 * Start a periodic SSE heartbeat and return a cancel function.
 * Caller must invoke cancel() in the req.on("close") handler.
 */
export function startHeartbeat(res: Response): () => void {
  const id = setInterval(() => {
    try { res.write(": ping\n\n"); } catch { clearInterval(id); }
  }, PING_INTERVAL_MS);
  return () => clearInterval(id);
}

// ─── Cleanup Builder ──────────────────────────────────────────────────────────

/**
 * Register the canonical SSE cleanup handler on a request.
 * Accepts any number of unsubscribe functions (bus.subscribe returns) and a
 * heartbeat cancel function.  All are called exactly once on connection close.
 *
 * Usage:
 *   const off1 = bus.subscribe(...);
 *   const off2 = bus.subscribe(...);
 *   const stopHb = startHeartbeat(res);
 *   onClose(req, stopHb, off1, off2);
 */
export function onClose(req: Request, ...cleanups: Array<() => void>): void {
  req.on("close", () => { for (const fn of cleanups) { try { fn(); } catch {} } });
}
