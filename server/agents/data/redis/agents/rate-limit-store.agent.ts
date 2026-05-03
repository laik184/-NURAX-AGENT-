import { transitionState } from "../state.js";
import type { RateLimitEntry, RedisAgentState, RedisResponse } from "../types.js";
import { buildError, buildLog } from "../utils/logger.util.js";
import { buildRateLimitKey } from "../utils/key-builder.util.js";
import { getAdapter } from "../utils/redis-client.util.js";

const SOURCE = "rate-limit-store";

export interface RateLimitResult {
  readonly nextState: Readonly<RedisAgentState>;
  readonly output: Readonly<RedisResponse<{
    allowed: boolean;
    current: number;
    remaining: number;
    resetInSeconds: number;
  }>>;
}

export async function incrementRateLimit(
  entry: Readonly<RateLimitEntry>,
  state: Readonly<RedisAgentState>,
): Promise<RateLimitResult> {
  const key = buildRateLimitKey(entry.key, entry.namespace, state.config?.keyPrefix);

  try {
    const adapter = getAdapter();
    const current = await adapter.incr(key);

    if (current === 1) {
      await adapter.expire(key, entry.windowSeconds);
    }

    const allowed = current <= entry.maxRequests;
    const remaining = Math.max(0, entry.maxRequests - current);
    const log = buildLog(
      SOURCE,
      `Rate limit key="${key}" current=${current}/${entry.maxRequests} allowed=${allowed} remaining=${remaining}`,
    );

    return {
      nextState: transitionState(state, { appendLog: log }),
      output: Object.freeze({
        success: true,
        data: Object.freeze({ allowed, current, remaining, resetInSeconds: entry.windowSeconds }),
        logs: Object.freeze([log]),
        operation: "ratelimit:increment" as const,
      }),
    };
  } catch (err) {
    const msg = `Rate limit increment failed for "${entry.key}": ${err instanceof Error ? err.message : String(err)}`;
    return {
      nextState: transitionState(state, { appendError: buildError(SOURCE, msg), appendLog: buildLog(SOURCE, msg) }),
      output: Object.freeze({
        success: false,
        logs: Object.freeze([buildLog(SOURCE, msg)]),
        error: "increment_failed",
        operation: "ratelimit:increment" as const,
      }),
    };
  }
}

export async function resetRateLimit(
  entry: Pick<RateLimitEntry, "key" | "namespace">,
  state: Readonly<RedisAgentState>,
): Promise<{ readonly nextState: Readonly<RedisAgentState>; readonly output: Readonly<RedisResponse> }> {
  const key = buildRateLimitKey(entry.key, entry.namespace, state.config?.keyPrefix);

  try {
    await getAdapter().del(key);
    const log = buildLog(SOURCE, `Rate limit reset: key="${key}"`);
    return {
      nextState: transitionState(state, { appendLog: log }),
      output: Object.freeze({ success: true, logs: Object.freeze([log]), operation: "ratelimit:reset" as const }),
    };
  } catch (err) {
    const msg = `Rate limit reset failed for "${entry.key}": ${err instanceof Error ? err.message : String(err)}`;
    return {
      nextState: transitionState(state, { appendError: buildError(SOURCE, msg), appendLog: buildLog(SOURCE, msg) }),
      output: Object.freeze({ success: false, logs: Object.freeze([buildLog(SOURCE, msg)]), error: "reset_failed", operation: "ratelimit:reset" as const }),
    };
  }
}

export async function getRateLimitStatus(
  entry: Pick<RateLimitEntry, "key" | "namespace" | "maxRequests">,
  state: Readonly<RedisAgentState>,
): Promise<{ readonly nextState: Readonly<RedisAgentState>; readonly output: Readonly<RedisResponse<{ current: number; remaining: number }>> }> {
  const key = buildRateLimitKey(entry.key, entry.namespace, state.config?.keyPrefix);

  try {
    const raw = await getAdapter().get(key);
    const current = raw ? parseInt(raw, 10) : 0;
    const remaining = Math.max(0, entry.maxRequests - current);
    const log = buildLog(SOURCE, `Rate limit status: key="${key}" current=${current} remaining=${remaining}`);
    return {
      nextState: transitionState(state, { appendLog: log }),
      output: Object.freeze({ success: true, data: Object.freeze({ current, remaining }), logs: Object.freeze([log]) }),
    };
  } catch (err) {
    const msg = `Rate limit status failed for "${entry.key}": ${err instanceof Error ? err.message : String(err)}`;
    return {
      nextState: transitionState(state, { appendError: buildError(SOURCE, msg), appendLog: buildLog(SOURCE, msg) }),
      output: Object.freeze({ success: false, logs: Object.freeze([buildLog(SOURCE, msg)]), error: "status_failed" }),
    };
  }
}
