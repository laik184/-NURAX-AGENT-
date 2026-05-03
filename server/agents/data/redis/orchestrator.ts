import { deleteCache, flushNamespace, getCache, setCache } from "./agents/cache-manager.agent.js";
import { initConnection, disconnectRedis } from "./agents/connection.agent.js";
import { buildNamespacedKey, buildStrategyKeys, listKeys } from "./agents/key-manager.agent.js";
import { publishMessage, subscribeToChannel, unsubscribeFromChannel } from "./agents/pubsub-manager.agent.js";
import { getRateLimitStatus, incrementRateLimit, resetRateLimit } from "./agents/rate-limit-store.agent.js";
import { createSession, destroySession, getSession, validateSession } from "./agents/session-manager.agent.js";
import { INITIAL_STATE, transitionState } from "./state.js";
import type {
  CachePayload,
  KeyConfig,
  PubSubMessage,
  RateLimitEntry,
  RedisAgentState,
  RedisConfig,
  RedisResponse,
  SessionData,
} from "./types.js";
import { buildLog } from "./utils/logger.util.js";

const SOURCE = "orchestrator";

export interface OrchestratorResult<T = unknown> {
  readonly nextState: Readonly<RedisAgentState>;
  readonly output: Readonly<RedisResponse<T>>;
}

// ─── Connection ──────────────────────────────────────────────────────────────

export async function initRedis(
  config: Partial<RedisConfig>,
  state: Readonly<RedisAgentState> = INITIAL_STATE,
): Promise<OrchestratorResult<{ url: string }>> {
  const log = buildLog(SOURCE, "Initiating Redis connection");
  const patchedState = transitionState(state, { appendLog: log });
  return initConnection(config, patchedState);
}

export async function disconnectFromRedis(
  state: Readonly<RedisAgentState>,
): Promise<OrchestratorResult> {
  return disconnectRedis(state);
}

// ─── Cache ────────────────────────────────────────────────────────────────────

export async function setCache_o(
  payload: Readonly<CachePayload>,
  state: Readonly<RedisAgentState>,
): Promise<OrchestratorResult> {
  return setCache(payload, state);
}

export async function getCache_o<T = unknown>(
  key: string,
  namespace: string,
  state: Readonly<RedisAgentState>,
): Promise<OrchestratorResult<T | null>> {
  return getCache<T>(key, namespace, state);
}

export async function deleteCache_o(
  key: string,
  namespace: string,
  state: Readonly<RedisAgentState>,
): Promise<OrchestratorResult> {
  return deleteCache(key, namespace, state);
}

export async function flushNamespace_o(
  namespace: string,
  state: Readonly<RedisAgentState>,
): Promise<OrchestratorResult<{ flushed: number }>> {
  return flushNamespace(namespace, state);
}

// ─── Session ──────────────────────────────────────────────────────────────────

export async function createSession_o(
  data: Omit<SessionData, "createdAt" | "expiresAt">,
  state: Readonly<RedisAgentState>,
): Promise<OrchestratorResult<{ sessionId: string; expiresAt: number }>> {
  return createSession(data, state);
}

export async function getSession_o(
  sessionId: string,
  state: Readonly<RedisAgentState>,
): Promise<OrchestratorResult<SessionData | null>> {
  return getSession(sessionId, state);
}

export async function validateSession_o(
  sessionId: string,
  state: Readonly<RedisAgentState>,
): Promise<OrchestratorResult<{ valid: boolean; userId?: string }>> {
  return validateSession(sessionId, state);
}

export async function destroySession_o(
  sessionId: string,
  state: Readonly<RedisAgentState>,
): Promise<OrchestratorResult> {
  return destroySession(sessionId, state);
}

// ─── PubSub ───────────────────────────────────────────────────────────────────

export async function publishMessage_o(
  channel: string,
  payload: unknown,
  state: Readonly<RedisAgentState>,
): Promise<OrchestratorResult<{ channel: string; receiverCount: number }>> {
  return publishMessage(channel, payload, state);
}

export async function subscribeToChannel_o(
  channel: string,
  onMessage: (message: PubSubMessage) => void,
  state: Readonly<RedisAgentState>,
): Promise<OrchestratorResult<{ channel: string }>> {
  return subscribeToChannel(channel, onMessage, state);
}

export async function unsubscribeFromChannel_o(
  channel: string,
  state: Readonly<RedisAgentState>,
): Promise<OrchestratorResult> {
  return unsubscribeFromChannel(channel, state);
}

// ─── Rate Limiting ────────────────────────────────────────────────────────────

export async function incrementRateLimit_o(
  entry: Readonly<RateLimitEntry>,
  state: Readonly<RedisAgentState>,
): Promise<OrchestratorResult<{ allowed: boolean; current: number; remaining: number; resetInSeconds: number }>> {
  return incrementRateLimit(entry, state);
}

export async function resetRateLimit_o(
  entry: Pick<RateLimitEntry, "key" | "namespace">,
  state: Readonly<RedisAgentState>,
): Promise<OrchestratorResult> {
  return resetRateLimit(entry, state);
}

export async function getRateLimitStatus_o(
  entry: Pick<RateLimitEntry, "key" | "namespace" | "maxRequests">,
  state: Readonly<RedisAgentState>,
): Promise<OrchestratorResult<{ current: number; remaining: number }>> {
  return getRateLimitStatus(entry, state);
}

// ─── Keys ─────────────────────────────────────────────────────────────────────

export function buildKey_o(
  config: Readonly<KeyConfig>,
  state: Readonly<RedisAgentState>,
): OrchestratorResult<{ key: string }> {
  return buildNamespacedKey(config, state);
}

export function buildStrategyKey_o(
  strategy: "cache" | "session" | "ratelimit" | "pubsub",
  identifier: string,
  state: Readonly<RedisAgentState>,
): OrchestratorResult<{ key: string }> {
  return buildStrategyKeys(strategy, identifier, state);
}

export async function listKeys_o(
  pattern: string,
  state: Readonly<RedisAgentState>,
): Promise<OrchestratorResult<{ keys: readonly string[]; count: number }>> {
  return listKeys(pattern, state);
}
