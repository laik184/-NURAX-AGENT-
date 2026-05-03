const DEFAULT_BASE_MS  = 500;
const DEFAULT_MAX_MS   = 30_000;
const JITTER_FACTOR    = 0.1;

export function exponentialDelay(attempt: number, baseMs = DEFAULT_BASE_MS, maxMs = DEFAULT_MAX_MS): number {
  const raw = baseMs * Math.pow(2, attempt - 1);
  const jitter = raw * JITTER_FACTOR * Math.random();
  return Math.min(Math.round(raw + jitter), maxMs);
}

export function linearDelay(attempt: number, baseMs = DEFAULT_BASE_MS, maxMs = DEFAULT_MAX_MS): number {
  return Math.min(baseMs * attempt, maxMs);
}

export function immediateDelay(): number {
  return 0;
}

export function getDelay(
  kind: "exponential" | "linear" | "immediate" | "no-retry",
  attempt: number,
  baseMs?: number,
  maxMs?: number
): number {
  switch (kind) {
    case "exponential": return exponentialDelay(attempt, baseMs, maxMs);
    case "linear":      return linearDelay(attempt, baseMs, maxMs);
    case "immediate":   return immediateDelay();
    default:            return 0;
  }
}

export function formatDelay(ms: number): string {
  if (ms === 0)       return "immediately";
  if (ms < 1_000)    return `${ms}ms`;
  if (ms < 60_000)   return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
}
