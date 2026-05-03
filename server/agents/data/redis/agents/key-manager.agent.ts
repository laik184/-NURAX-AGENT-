import { transitionState } from "../state.js";
import type { KeyConfig, RedisAgentState, RedisResponse } from "../types.js";
import { buildLog } from "../utils/logger.util.js";
import {
  buildCacheKey,
  buildKey,
  buildPatternKey,
  buildPubSubKey,
  buildRateLimitKey,
  buildSessionKey,
  parseKey,
  sanitizeKey,
} from "../utils/key-builder.util.js";
import { getAdapter } from "../utils/redis-client.util.js";

const SOURCE = "key-manager";

export interface KeyResult<T = unknown> {
  readonly nextState: Readonly<RedisAgentState>;
  readonly output: Readonly<RedisResponse<T>>;
}

export function buildNamespacedKey(
  config: Readonly<KeyConfig>,
  state: Readonly<RedisAgentState>,
): KeyResult<{ key: string }> {
  const sanitized: KeyConfig = Object.freeze({
    ...config,
    namespace: sanitizeKey(config.namespace),
    entity: sanitizeKey(config.entity),
    identifier: config.identifier ? sanitizeKey(config.identifier) : undefined,
    prefix: config.prefix ?? state.config?.keyPrefix,
  });

  const key = buildKey(sanitized);
  const log = buildLog(SOURCE, `Key built: "${key}"`);

  return {
    nextState: transitionState(state, { addCacheKey: key, appendLog: log }),
    output: Object.freeze({ success: true, data: Object.freeze({ key }), logs: Object.freeze([log]), operation: "key:build" as const }),
  };
}

export function buildStrategyKeys(
  strategy: "cache" | "session" | "ratelimit" | "pubsub",
  identifier: string,
  state: Readonly<RedisAgentState>,
): KeyResult<{ key: string }> {
  const prefix = state.config?.keyPrefix;
  let key: string;

  switch (strategy) {
    case "cache":    key = buildCacheKey("default", identifier, prefix); break;
    case "session":  key = buildSessionKey(identifier, prefix); break;
    case "ratelimit":key = buildRateLimitKey(identifier, undefined, prefix); break;
    case "pubsub":   key = buildPubSubKey(identifier, prefix); break;
    default:         key = buildCacheKey("default", identifier, prefix);
  }

  const log = buildLog(SOURCE, `Strategy key [${strategy}] built: "${key}"`);
  return {
    nextState: transitionState(state, { appendLog: log }),
    output: Object.freeze({ success: true, data: Object.freeze({ key }), logs: Object.freeze([log]) }),
  };
}

export async function listKeys(
  pattern: string,
  state: Readonly<RedisAgentState>,
): Promise<KeyResult<{ keys: readonly string[]; count: number }>> {
  const safePattern = buildPatternKey(sanitizeKey(pattern), state.config?.keyPrefix);

  try {
    const keys = await getAdapter().keys(safePattern);
    const log = buildLog(SOURCE, `Keys listed: pattern="${safePattern}" count=${keys.length}`);
    return {
      nextState: transitionState(state, { appendLog: log }),
      output: Object.freeze({ success: true, data: Object.freeze({ keys: Object.freeze(keys), count: keys.length }), logs: Object.freeze([log]) }),
    };
  } catch (err) {
    const msg = `Key list failed for pattern="${pattern}": ${err instanceof Error ? err.message : String(err)}`;
    return {
      nextState: transitionState(state, { appendLog: buildLog(SOURCE, msg) }),
      output: Object.freeze({ success: false, logs: Object.freeze([buildLog(SOURCE, msg)]), error: "list_failed" }),
    };
  }
}

export function parseNamespacedKey(
  key: string,
  state: Readonly<RedisAgentState>,
): KeyResult<{ parts: readonly string[] }> {
  const parts = parseKey(key);
  const log = buildLog(SOURCE, `Key parsed: "${key}" → ${parts.join(" | ")}`);
  return {
    nextState: transitionState(state, { appendLog: log }),
    output: Object.freeze({ success: true, data: Object.freeze({ parts }), logs: Object.freeze([log]) }),
  };
}
