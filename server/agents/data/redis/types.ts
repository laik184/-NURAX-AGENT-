export type RedisStatus = "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "RECONNECTING" | "FAILED";

export type RedisOperation =
  | "cache:set"
  | "cache:get"
  | "cache:delete"
  | "cache:flush"
  | "session:create"
  | "session:get"
  | "session:destroy"
  | "session:validate"
  | "pubsub:publish"
  | "pubsub:subscribe"
  | "pubsub:unsubscribe"
  | "ratelimit:increment"
  | "ratelimit:reset"
  | "key:build"
  | "connection:init"
  | "connection:disconnect";

export interface RedisConfig {
  readonly host: string;
  readonly port: number;
  readonly password?: string;
  readonly db?: number;
  readonly keyPrefix?: string;
  readonly tls?: boolean;
  readonly connectTimeout?: number;
  readonly maxRetries?: number;
  readonly retryDelay?: number;
  readonly lazyConnect?: boolean;
}

export interface RedisResponse<T = unknown> {
  readonly success: boolean;
  readonly data?: T;
  readonly logs: readonly string[];
  readonly error?: string;
  readonly operation?: RedisOperation;
}

export interface CachePayload {
  readonly key: string;
  readonly value: unknown;
  readonly ttl?: number;
  readonly namespace?: string;
}

export interface SessionData {
  readonly sessionId: string;
  readonly userId: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly ttl?: number;
  readonly createdAt: number;
  readonly expiresAt?: number;
}

export interface PubSubMessage {
  readonly channel: string;
  readonly payload: unknown;
  readonly timestamp: number;
  readonly messageId?: string;
}

export interface RateLimitEntry {
  readonly key: string;
  readonly windowSeconds: number;
  readonly maxRequests: number;
  readonly namespace?: string;
}

export interface KeyConfig {
  readonly namespace: string;
  readonly entity: string;
  readonly identifier?: string;
  readonly prefix?: string;
}

export interface RedisAgentState {
  readonly isConnected: boolean;
  readonly activeConnections: number;
  readonly cacheKeys: readonly string[];
  readonly sessions: readonly string[];
  readonly pubsubChannels: readonly string[];
  readonly logs: readonly string[];
  readonly errors: readonly string[];
  readonly status: RedisStatus;
  readonly config?: Readonly<RedisConfig>;
}

export interface StatePatch {
  readonly isConnected?: boolean;
  readonly activeConnections?: number;
  readonly addCacheKey?: string;
  readonly removeCacheKey?: string;
  readonly addSession?: string;
  readonly removeSession?: string;
  readonly addChannel?: string;
  readonly removeChannel?: string;
  readonly status?: RedisStatus;
  readonly config?: Readonly<RedisConfig>;
  readonly appendLog?: string;
  readonly appendError?: string;
}

export interface RedisClientAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  expire(key: string, seconds: number): Promise<void>;
  incr(key: string): Promise<number>;
  incrby(key: string, amount: number): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  flushPattern(pattern: string): Promise<number>;
  publish(channel: string, message: string): Promise<number>;
  subscribe(channel: string, listener: (message: string) => void): Promise<void>;
  unsubscribe(channel: string): Promise<void>;
  isConnected(): boolean;
}
