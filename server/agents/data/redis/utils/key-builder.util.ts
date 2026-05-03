import type { KeyConfig } from "../types.js";

const SEPARATOR = ":";

export function buildKey(config: Readonly<KeyConfig>): string {
  const parts: string[] = [];
  if (config.prefix) parts.push(config.prefix);
  parts.push(config.namespace);
  parts.push(config.entity);
  if (config.identifier) parts.push(config.identifier);
  return parts.join(SEPARATOR);
}

export function buildCacheKey(namespace: string, key: string, prefix?: string): string {
  return buildKey({ prefix, namespace: prefix ? `${prefix}:cache` : "cache", entity: namespace, identifier: key });
}

export function buildSessionKey(sessionId: string, prefix?: string): string {
  return buildKey({ prefix, namespace: "session", entity: sessionId });
}

export function buildRateLimitKey(identifier: string, namespace?: string, prefix?: string): string {
  return buildKey({ prefix, namespace: namespace ?? "ratelimit", entity: identifier });
}

export function buildPubSubKey(channel: string, prefix?: string): string {
  return buildKey({ prefix, namespace: "pubsub", entity: channel });
}

export function buildPatternKey(namespace: string, prefix?: string): string {
  return [prefix, namespace, "*"].filter(Boolean).join(SEPARATOR);
}

export function parseKey(key: string): readonly string[] {
  return Object.freeze(key.split(SEPARATOR));
}

export function sanitizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9:_\-.*]/g, "_");
}
