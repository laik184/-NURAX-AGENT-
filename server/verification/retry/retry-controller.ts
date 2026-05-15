/**
 * retry-controller.ts
 *
 * Track per-run verification retry state.
 *
 * Ownership: verification/retry — state management only.
 * No bus access, no LLM calls, no I/O.
 *
 * Lifecycle: one RetryController instance per agent run.
 * Callers create it, pass it to the verification gate, discard on run end.
 */

import type { RetryState } from "../types.ts";

const DEFAULT_MAX_RETRIES = 3;

export class RetryController {
  private readonly state: RetryState;

  constructor(runId: string, maxRetries = DEFAULT_MAX_RETRIES) {
    this.state = { runId, attempts: 0, maxRetries, exhausted: false };
  }

  /** Increment attempt counter. Returns current attempt number (1-based). */
  recordAttempt(): number {
    this.state.attempts++;
    if (this.state.attempts >= this.state.maxRetries) {
      this.state.exhausted = true;
    }
    return this.state.attempts;
  }

  get attempts(): number  { return this.state.attempts; }
  get maxRetries(): number { return this.state.maxRetries; }
  get exhausted(): boolean { return this.state.exhausted; }

  snapshot(): RetryState {
    return { ...this.state };
  }
}

// ─── Per-run registry ─────────────────────────────────────────────────────────
// Keyed by runId so the tool-loop can get-or-create its controller.

const _registry = new Map<string, RetryController>();

export function getOrCreateRetryController(runId: string): RetryController {
  let ctrl = _registry.get(runId);
  if (!ctrl) {
    ctrl = new RetryController(runId);
    _registry.set(runId, ctrl);
  }
  return ctrl;
}

export function releaseRetryController(runId: string): void {
  _registry.delete(runId);
}
