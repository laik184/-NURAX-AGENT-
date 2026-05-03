import type { RedisAgentState, StatePatch } from "./types.js";

export const INITIAL_STATE: Readonly<RedisAgentState> = Object.freeze({
  isConnected: false,
  activeConnections: 0,
  cacheKeys: Object.freeze([]),
  sessions: Object.freeze([]),
  pubsubChannels: Object.freeze([]),
  logs: Object.freeze([]),
  errors: Object.freeze([]),
  status: "DISCONNECTED",
});

export function transitionState(
  current: Readonly<RedisAgentState>,
  patch: StatePatch,
): Readonly<RedisAgentState> {
  const nextLogs = patch.appendLog
    ? Object.freeze([...current.logs, patch.appendLog])
    : current.logs;

  const nextErrors = patch.appendError
    ? Object.freeze([...current.errors, patch.appendError])
    : current.errors;

  let nextCacheKeys = current.cacheKeys;
  if (patch.addCacheKey) nextCacheKeys = Object.freeze([...nextCacheKeys, patch.addCacheKey]);
  if (patch.removeCacheKey) nextCacheKeys = Object.freeze(nextCacheKeys.filter((k) => k !== patch.removeCacheKey));

  let nextSessions = current.sessions;
  if (patch.addSession) nextSessions = Object.freeze([...nextSessions, patch.addSession]);
  if (patch.removeSession) nextSessions = Object.freeze(nextSessions.filter((s) => s !== patch.removeSession));

  let nextChannels = current.pubsubChannels;
  if (patch.addChannel) nextChannels = Object.freeze([...nextChannels, patch.addChannel]);
  if (patch.removeChannel) nextChannels = Object.freeze(nextChannels.filter((c) => c !== patch.removeChannel));

  return Object.freeze({
    isConnected: patch.isConnected ?? current.isConnected,
    activeConnections: patch.activeConnections ?? current.activeConnections,
    cacheKeys: nextCacheKeys,
    sessions: nextSessions,
    pubsubChannels: nextChannels,
    logs: nextLogs,
    errors: nextErrors,
    status: patch.status ?? current.status,
    config: patch.config ?? current.config,
  });
}
