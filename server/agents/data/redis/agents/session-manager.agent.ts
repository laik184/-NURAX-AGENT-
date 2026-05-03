import { transitionState } from "../state.js";
import type { RedisAgentState, RedisResponse, SessionData } from "../types.js";
import { buildError, buildLog } from "../utils/logger.util.js";
import { buildSessionKey } from "../utils/key-builder.util.js";
import { clampTTL, computeSessionExpiry, isExpired, TTL } from "../utils/ttl-manager.util.js";
import { deserializeSession, serializeSession } from "../utils/serializer.util.js";
import { getAdapter } from "../utils/redis-client.util.js";

const SOURCE = "session-manager";

export interface SessionResult<T = unknown> {
  readonly nextState: Readonly<RedisAgentState>;
  readonly output: Readonly<RedisResponse<T>>;
}

export async function createSession(
  data: Omit<SessionData, "createdAt" | "expiresAt">,
  state: Readonly<RedisAgentState>,
): Promise<SessionResult<{ sessionId: string; expiresAt: number }>> {
  const ttl = clampTTL(data.ttl ?? TTL.SESSION_DEFAULT);
  const session: SessionData = Object.freeze({
    ...data,
    createdAt: Date.now(),
    expiresAt: computeSessionExpiry(ttl),
  });

  const key = buildSessionKey(session.sessionId, state.config?.keyPrefix);

  try {
    await getAdapter().set(key, serializeSession(session), ttl);
    const log = buildLog(SOURCE, `Session created: id=${session.sessionId} userId=${session.userId} ttl=${ttl}s`);
    return {
      nextState: transitionState(state, { addSession: session.sessionId, appendLog: log }),
      output: Object.freeze({
        success: true,
        data: Object.freeze({ sessionId: session.sessionId, expiresAt: session.expiresAt! }),
        logs: Object.freeze([log]),
        operation: "session:create" as const,
      }),
    };
  } catch (err) {
    const msg = `Session create failed: ${err instanceof Error ? err.message : String(err)}`;
    return {
      nextState: transitionState(state, { appendError: buildError(SOURCE, msg), appendLog: buildLog(SOURCE, msg) }),
      output: Object.freeze({ success: false, logs: Object.freeze([buildLog(SOURCE, msg)]), error: "create_failed", operation: "session:create" as const }),
    };
  }
}

export async function getSession(
  sessionId: string,
  state: Readonly<RedisAgentState>,
): Promise<SessionResult<SessionData | null>> {
  const key = buildSessionKey(sessionId, state.config?.keyPrefix);

  try {
    const raw = await getAdapter().get(key);
    if (!raw) {
      const log = buildLog(SOURCE, `Session not found: id=${sessionId}`);
      return {
        nextState: transitionState(state, { appendLog: log }),
        output: Object.freeze({ success: true, data: null, logs: Object.freeze([log]), operation: "session:get" as const }),
      };
    }
    const session = deserializeSession<SessionData>(raw);
    const log = buildLog(SOURCE, `Session retrieved: id=${sessionId} userId=${session.userId}`);
    return {
      nextState: transitionState(state, { appendLog: log }),
      output: Object.freeze({ success: true, data: session, logs: Object.freeze([log]), operation: "session:get" as const }),
    };
  } catch (err) {
    const msg = `Session get failed: ${err instanceof Error ? err.message : String(err)}`;
    return {
      nextState: transitionState(state, { appendError: buildError(SOURCE, msg), appendLog: buildLog(SOURCE, msg) }),
      output: Object.freeze({ success: false, data: null, logs: Object.freeze([buildLog(SOURCE, msg)]), error: "get_failed", operation: "session:get" as const }),
    };
  }
}

export async function validateSession(
  sessionId: string,
  state: Readonly<RedisAgentState>,
): Promise<SessionResult<{ valid: boolean; userId?: string }>> {
  const result = await getSession(sessionId, state);

  if (!result.output.success || !result.output.data) {
    const log = buildLog(SOURCE, `Session invalid (not found): id=${sessionId}`);
    return {
      nextState: transitionState(result.nextState, { appendLog: log }),
      output: Object.freeze({ success: true, data: Object.freeze({ valid: false }), logs: Object.freeze([log]), operation: "session:validate" as const }),
    };
  }

  const session = result.output.data;
  if (session.expiresAt && isExpired(session.expiresAt)) {
    const log = buildLog(SOURCE, `Session expired: id=${sessionId}`);
    await destroySession(sessionId, result.nextState);
    return {
      nextState: transitionState(result.nextState, { removeSession: sessionId, appendLog: log }),
      output: Object.freeze({ success: true, data: Object.freeze({ valid: false }), logs: Object.freeze([log]), operation: "session:validate" as const }),
    };
  }

  const log = buildLog(SOURCE, `Session valid: id=${sessionId} userId=${session.userId}`);
  return {
    nextState: transitionState(result.nextState, { appendLog: log }),
    output: Object.freeze({ success: true, data: Object.freeze({ valid: true, userId: session.userId }), logs: Object.freeze([log]), operation: "session:validate" as const }),
  };
}

export async function destroySession(
  sessionId: string,
  state: Readonly<RedisAgentState>,
): Promise<SessionResult> {
  const key = buildSessionKey(sessionId, state.config?.keyPrefix);

  try {
    await getAdapter().del(key);
    const log = buildLog(SOURCE, `Session destroyed: id=${sessionId}`);
    return {
      nextState: transitionState(state, { removeSession: sessionId, appendLog: log }),
      output: Object.freeze({ success: true, logs: Object.freeze([log]), operation: "session:destroy" as const }),
    };
  } catch (err) {
    const msg = `Session destroy failed: ${err instanceof Error ? err.message : String(err)}`;
    return {
      nextState: transitionState(state, { appendError: buildError(SOURCE, msg), appendLog: buildLog(SOURCE, msg) }),
      output: Object.freeze({ success: false, logs: Object.freeze([buildLog(SOURCE, msg)]), error: "destroy_failed", operation: "session:destroy" as const }),
    };
  }
}
