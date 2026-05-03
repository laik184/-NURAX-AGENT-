import { transitionState } from "../state.js";
import type { RedisAgentState, RedisConfig, RedisResponse } from "../types.js";
import { buildError, buildLog } from "../utils/logger.util.js";
import {
  buildConnectionUrl,
  defaultConfig,
  getAdapter,
  hasAdapter,
} from "../utils/redis-client.util.js";

const SOURCE = "connection";

export interface ConnectionResult {
  readonly nextState: Readonly<RedisAgentState>;
  readonly output: Readonly<RedisResponse<{ url: string }>>;
}

export async function initConnection(
  config: Partial<RedisConfig>,
  state: Readonly<RedisAgentState>,
): Promise<ConnectionResult> {
  const resolved = defaultConfig(config);

  if (!hasAdapter()) {
    const msg = "No Redis adapter registered — call registerAdapter() before initConnection()";
    return {
      nextState: transitionState(state, {
        status: "FAILED",
        appendError: buildError(SOURCE, msg),
        appendLog: buildLog(SOURCE, msg),
      }),
      output: Object.freeze({ success: false, logs: Object.freeze([buildLog(SOURCE, msg)]), error: "no_adapter" }),
    };
  }

  if (state.isConnected) {
    const log = buildLog(SOURCE, "Already connected — skipping reconnect");
    return {
      nextState: transitionState(state, { appendLog: log }),
      output: Object.freeze({ success: true, data: Object.freeze({ url: buildConnectionUrl(resolved) }), logs: Object.freeze([log]) }),
    };
  }

  try {
    const adapter = getAdapter();
    const url = buildConnectionUrl(resolved);
    const connectingLog = buildLog(SOURCE, `Connecting to Redis at ${resolved.host}:${resolved.port}`);

    const nextState = transitionState(state, {
      status: "CONNECTING",
      config: resolved,
      appendLog: connectingLog,
    });

    await adapter.connect();

    const connectedLog = buildLog(SOURCE, `Connected to Redis: ${url}`);
    return {
      nextState: transitionState(nextState, {
        isConnected: true,
        activeConnections: 1,
        status: "CONNECTED",
        appendLog: connectedLog,
      }),
      output: Object.freeze({
        success: true,
        data: Object.freeze({ url }),
        logs: Object.freeze([connectingLog, connectedLog]),
        operation: "connection:init" as const,
      }),
    };
  } catch (err) {
    const msg = `Redis connection failed: ${err instanceof Error ? err.message : String(err)}`;
    return {
      nextState: transitionState(state, {
        status: "FAILED",
        isConnected: false,
        appendError: buildError(SOURCE, msg),
        appendLog: buildLog(SOURCE, msg),
      }),
      output: Object.freeze({
        success: false,
        logs: Object.freeze([buildLog(SOURCE, msg)]),
        error: "connection_failed",
        operation: "connection:init" as const,
      }),
    };
  }
}

export async function disconnectRedis(
  state: Readonly<RedisAgentState>,
): Promise<ConnectionResult> {
  if (!state.isConnected) {
    const log = buildLog(SOURCE, "Not connected — nothing to disconnect");
    return {
      nextState: transitionState(state, { appendLog: log }),
      output: Object.freeze({ success: true, logs: Object.freeze([log]) }),
    };
  }

  try {
    await getAdapter().disconnect();
    const log = buildLog(SOURCE, "Redis disconnected");
    return {
      nextState: transitionState(state, {
        isConnected: false,
        activeConnections: 0,
        status: "DISCONNECTED",
        appendLog: log,
      }),
      output: Object.freeze({
        success: true,
        logs: Object.freeze([log]),
        operation: "connection:disconnect" as const,
      }),
    };
  } catch (err) {
    const msg = `Disconnect error: ${err instanceof Error ? err.message : String(err)}`;
    return {
      nextState: transitionState(state, {
        appendError: buildError(SOURCE, msg),
        appendLog: buildLog(SOURCE, msg),
      }),
      output: Object.freeze({
        success: false,
        logs: Object.freeze([buildLog(SOURCE, msg)]),
        error: "disconnect_failed",
        operation: "connection:disconnect" as const,
      }),
    };
  }
}
