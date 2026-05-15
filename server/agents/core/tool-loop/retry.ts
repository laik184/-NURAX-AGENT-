/**
 * retry.ts
 *
 * Lightweight retry wrapper for transient failures in the tool-loop agent.
 *
 * Applies to: LLM API calls (the one place that currently dies permanently
 * on first failure — tool failures are returned as { ok: false } to the LLM
 * which naturally retries them in the next loop step).
 *
 * Classification:
 *   Retryable  — network timeouts, rate limits, 5xx gateway errors, ECONNREFUSED
 *   Permanent  — auth failures (401/403), invalid key, out of memory, syntax errors
 *
 * Backoff:
 *   Exponential with ±10% jitter — 500ms → 1000ms → 2000ms (capped at 30s)
 *
 * Safety:
 *   - AbortSignal checked before each attempt and during sleep
 *   - Hard cap: never exceeds MAX_RETRIES regardless of caller configuration
 *   - Permanent errors rethrown immediately — no unnecessary delay
 */

import { bus } from "../../../infrastructure/events/bus.ts";

const MAX_RETRIES   = 3;
const BASE_DELAY_MS = 500;
const MAX_DELAY_MS  = 30_000;
const JITTER_FACTOR = 0.1;

/** Error patterns that indicate a transient, retryable failure. */
const RETRYABLE_PATTERNS: readonly RegExp[] = [
  /timeout/i, /timed.?out/i, /etimedout/i,
  /econnrefused/i, /enotfound/i, /socket.?hang/i, /fetch.?failed/i,
  /network.?error/i, /network.?request.?failed/i,
  /\b5[0-9][0-9]\b/,                  // 5xx HTTP status
  /\b429\b/, /rate.?limit/i,          // too many requests
  /service.?unavailable/i,
  /bad.?gateway/i, /gateway.?timeout/i,
];

/** Error patterns that indicate a permanent failure — do not retry. */
const PERMANENT_PATTERNS: readonly RegExp[] = [
  /syntaxerror/i, /unexpected.?token/i,
  /permission.?denied/i, /eacces/i, /eperm/i,
  /out.?of.?memory/i, /enomem/i,
  /invalid.?api.?key/i, /\b401\b/, /\b403\b/,
  /no such file/i, /enoent/i,
];

export interface RetryOptions {
  /** Maximum number of attempts (including the first). Default: 3. Hard cap: MAX_RETRIES. */
  maxAttempts?: number;
  /** runId for SSE event emission. If omitted, no events are emitted. */
  runId?: string;
  /** Human-readable label for logging/events (e.g. "llm.chatWithTools"). */
  operationName?: string;
  /** If aborted, the current sleep is interrupted and the error is rethrown. */
  signal?: AbortSignal;
}

function isRetryable(message: string): boolean {
  if (PERMANENT_PATTERNS.some((p) => p.test(message))) return false;
  return RETRYABLE_PATTERNS.some((p) => p.test(message));
}

function exponentialDelay(attempt: number): number {
  const raw    = BASE_DELAY_MS * Math.pow(2, attempt - 1);
  const jitter = raw * JITTER_FACTOR * Math.random();
  return Math.min(Math.round(raw + jitter), MAX_DELAY_MS);
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Error("Aborted"));
    if (ms <= 0) return resolve();
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => { clearTimeout(timer); reject(new Error("Aborted")); });
  });
}

function emitRetryEvent(
  runId: string,
  attempt: number,
  maxAttempts: number,
  delayMs: number,
  error: string,
  operationName: string
): void {
  bus.emit("agent.event", {
    runId,
    eventType: "agent.retry" as any,
    phase: "tool-loop",
    ts: Date.now(),
    payload: {
      attempt,
      maxAttempts,
      delayMs,
      error: error.slice(0, 200),
      operation: operationName,
    },
  });
}

/**
 * Execute `fn` with automatic retry on transient failures.
 *
 * Permanent failures (auth, syntax, memory) are rethrown immediately.
 * Unknown failures are treated as retryable (fail-open for resilience).
 *
 * @throws The last error if all attempts fail.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {}
): Promise<T> {
  const maxAttempts   = Math.min(opts.maxAttempts ?? MAX_RETRIES, MAX_RETRIES);
  const runId         = opts.runId ?? "";
  const operationName = opts.operationName ?? "operation";

  let lastError: Error = new Error("Unknown error");

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (opts.signal?.aborted) throw new Error("Aborted");

    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (opts.signal?.aborted) throw lastError;

      const retryable = isRetryable(lastError.message);

      // Permanent error or last attempt — rethrow immediately
      if (!retryable || attempt >= maxAttempts) {
        throw lastError;
      }

      const delayMs = exponentialDelay(attempt);

      if (runId) {
        emitRetryEvent(runId, attempt, maxAttempts, delayMs, lastError.message, operationName);
      } else {
        console.warn(`[retry] ${operationName} attempt ${attempt}/${maxAttempts} failed — retrying in ${delayMs}ms: ${lastError.message.slice(0, 120)}`);
      }

      await sleep(delayMs, opts.signal);
    }
  }

  throw lastError;
}
