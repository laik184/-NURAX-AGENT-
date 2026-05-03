import type { RedisClientAdapter, RedisConfig } from "../types.js";

let _adapter: RedisClientAdapter | null = null;

export function registerAdapter(adapter: RedisClientAdapter): void {
  _adapter = adapter;
}

export function getAdapter(): RedisClientAdapter {
  if (!_adapter) {
    throw new Error("No Redis adapter registered. Call registerAdapter() before using the Redis module.");
  }
  return _adapter;
}

export function hasAdapter(): boolean {
  return _adapter !== null;
}

export function clearAdapter(): void {
  _adapter = null;
}

export function buildConnectionUrl(config: Readonly<RedisConfig>): string {
  const scheme = config.tls ? "rediss" : "redis";
  const auth = config.password ? `:${config.password}@` : "";
  const db = config.db !== undefined ? `/${config.db}` : "";
  return `${scheme}://${auth}${config.host}:${config.port}${db}`;
}

export function buildRetryStrategy(maxRetries: number, retryDelay: number): (attempt: number) => number | null {
  return (attempt: number): number | null => {
    if (attempt >= maxRetries) return null;
    return Math.min(retryDelay * Math.pow(2, attempt), 30000);
  };
}

export function defaultConfig(partial: Partial<RedisConfig> = {}): Readonly<RedisConfig> {
  return Object.freeze({
    host: partial.host ?? "localhost",
    port: partial.port ?? 6379,
    db: partial.db ?? 0,
    keyPrefix: partial.keyPrefix ?? "nura-x",
    tls: partial.tls ?? false,
    connectTimeout: partial.connectTimeout ?? 5000,
    maxRetries: partial.maxRetries ?? 3,
    retryDelay: partial.retryDelay ?? 1000,
    lazyConnect: partial.lazyConnect ?? true,
    ...(partial.password ? { password: partial.password } : {}),
  });
}
