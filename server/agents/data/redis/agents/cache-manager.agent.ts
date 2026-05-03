import { transitionState } from "../state.js";
import type { CachePayload, RedisAgentState, RedisResponse } from "../types.js";
import { buildError, buildLog } from "../utils/logger.util.js";
import { buildCacheKey, buildPatternKey } from "../utils/key-builder.util.js";
import { clampTTL, TTL } from "../utils/ttl-manager.util.js";
import { deserialize, isSafeToSerialize, serialize } from "../utils/serializer.util.js";
import { getAdapter } from "../utils/redis-client.util.js";

const SOURCE = "cache-manager";

export interface CacheResult<T = unknown> {
  readonly nextState: Readonly<RedisAgentState>;
  readonly output: Readonly<RedisResponse<T>>;
}

export async function setCache(
  payload: Readonly<CachePayload>,
  state: Readonly<RedisAgentState>,
): Promise<CacheResult> {
  const builtKey = buildCacheKey(payload.namespace ?? "default", payload.key, state.config?.keyPrefix);

  if (!isSafeToSerialize(payload.value)) {
    const msg = `Value for key "${payload.key}" is not serializable`;
    return {
      nextState: transitionState(state, {
        appendError: buildError(SOURCE, msg),
        appendLog: buildLog(SOURCE, msg),
      }),
      output: Object.freeze({ success: false, logs: Object.freeze([buildLog(SOURCE, msg)]), error: "not_serializable", operation: "cache:set" as const }),
    };
  }

  try {
    const ttl = clampTTL(payload.ttl ?? TTL.CACHE_DEFAULT);
    await getAdapter().set(builtKey, serialize(payload.value), ttl);
    const log = buildLog(SOURCE, `Cache SET key="${builtKey}" ttl=${ttl}s`);
    return {
      nextState: transitionState(state, { addCacheKey: builtKey, appendLog: log }),
      output: Object.freeze({ success: true, logs: Object.freeze([log]), operation: "cache:set" as const }),
    };
  } catch (err) {
    const msg = `Cache SET failed for "${payload.key}": ${err instanceof Error ? err.message : String(err)}`;
    return {
      nextState: transitionState(state, { appendError: buildError(SOURCE, msg), appendLog: buildLog(SOURCE, msg) }),
      output: Object.freeze({ success: false, logs: Object.freeze([buildLog(SOURCE, msg)]), error: "set_failed", operation: "cache:set" as const }),
    };
  }
}

export async function getCache<T = unknown>(
  key: string,
  namespace: string = "default",
  state: Readonly<RedisAgentState>,
): Promise<CacheResult<T | null>> {
  const builtKey = buildCacheKey(namespace, key, state.config?.keyPrefix);

  try {
    const raw = await getAdapter().get(builtKey);
    if (raw === null) {
      const log = buildLog(SOURCE, `Cache MISS key="${builtKey}"`);
      return {
        nextState: transitionState(state, { appendLog: log }),
        output: Object.freeze({ success: true, data: null, logs: Object.freeze([log]), operation: "cache:get" as const }),
      };
    }
    const data = deserialize<T>(raw);
    const log = buildLog(SOURCE, `Cache HIT key="${builtKey}"`);
    return {
      nextState: transitionState(state, { appendLog: log }),
      output: Object.freeze({ success: true, data, logs: Object.freeze([log]), operation: "cache:get" as const }),
    };
  } catch (err) {
    const msg = `Cache GET failed for "${key}": ${err instanceof Error ? err.message : String(err)}`;
    return {
      nextState: transitionState(state, { appendError: buildError(SOURCE, msg), appendLog: buildLog(SOURCE, msg) }),
      output: Object.freeze({ success: false, data: null, logs: Object.freeze([buildLog(SOURCE, msg)]), error: "get_failed", operation: "cache:get" as const }),
    };
  }
}

export async function deleteCache(
  key: string,
  namespace: string = "default",
  state: Readonly<RedisAgentState>,
): Promise<CacheResult> {
  const builtKey = buildCacheKey(namespace, key, state.config?.keyPrefix);

  try {
    await getAdapter().del(builtKey);
    const log = buildLog(SOURCE, `Cache DEL key="${builtKey}"`);
    return {
      nextState: transitionState(state, { removeCacheKey: builtKey, appendLog: log }),
      output: Object.freeze({ success: true, logs: Object.freeze([log]), operation: "cache:delete" as const }),
    };
  } catch (err) {
    const msg = `Cache DEL failed for "${key}": ${err instanceof Error ? err.message : String(err)}`;
    return {
      nextState: transitionState(state, { appendError: buildError(SOURCE, msg), appendLog: buildLog(SOURCE, msg) }),
      output: Object.freeze({ success: false, logs: Object.freeze([buildLog(SOURCE, msg)]), error: "delete_failed", operation: "cache:delete" as const }),
    };
  }
}

export async function flushNamespace(
  namespace: string,
  state: Readonly<RedisAgentState>,
): Promise<CacheResult<{ flushed: number }>> {
  const pattern = buildPatternKey(namespace, state.config?.keyPrefix);

  try {
    const flushed = await getAdapter().flushPattern(pattern);
    const log = buildLog(SOURCE, `Cache FLUSH namespace="${namespace}" flushed=${flushed} keys`);
    return {
      nextState: transitionState(state, { appendLog: log }),
      output: Object.freeze({ success: true, data: Object.freeze({ flushed }), logs: Object.freeze([log]), operation: "cache:flush" as const }),
    };
  } catch (err) {
    const msg = `Cache FLUSH failed for namespace="${namespace}": ${err instanceof Error ? err.message : String(err)}`;
    return {
      nextState: transitionState(state, { appendError: buildError(SOURCE, msg), appendLog: buildLog(SOURCE, msg) }),
      output: Object.freeze({ success: false, logs: Object.freeze([buildLog(SOURCE, msg)]), error: "flush_failed", operation: "cache:flush" as const }),
    };
  }
}
