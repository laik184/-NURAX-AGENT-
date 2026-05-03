export const TTL = Object.freeze({
  CACHE_DEFAULT: 3600,
  CACHE_SHORT: 300,
  CACHE_LONG: 86400,
  SESSION_DEFAULT: 3600 * 24,
  SESSION_PERSISTENT: 3600 * 24 * 30,
  RATE_LIMIT_MINUTE: 60,
  RATE_LIMIT_HOUR: 3600,
  RATE_LIMIT_DAY: 86400,
  PUBSUB_MESSAGE: 300,
}) as Readonly<Record<string, number>>;

export function toSeconds(ms: number): number {
  return Math.ceil(ms / 1000);
}

export function fromSeconds(s: number): number {
  return s * 1000;
}

export function ttlFromExpiry(expiresAt: number): number {
  const remaining = Math.ceil((expiresAt - Date.now()) / 1000);
  return Math.max(remaining, 1);
}

export function computeSessionExpiry(ttlSeconds: number): number {
  return Date.now() + ttlSeconds * 1000;
}

export function isExpired(expiresAt: number): boolean {
  return Date.now() > expiresAt;
}

export function clampTTL(ttl: number, min: number = 1, max: number = 2592000): number {
  return Math.min(Math.max(ttl, min), max);
}
