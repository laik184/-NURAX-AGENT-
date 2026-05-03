# Redis Module — HVP-Compliant Architecture

## 1. Redis Module Flow

```
RedisConfig (host, port, password, db, keyPrefix, ...)
         |
         ▼
initRedis(config, state)
         |
         └── connection.agent → registerAdapter → adapter.connect()
                  |
                  ▼ (state: CONNECTED)

Operations dispatched via orchestrator:

  ┌─────────────┬──────────────────────────────────────────────────────────┐
  │ Domain      │ Flow                                                      │
  ├─────────────┼──────────────────────────────────────────────────────────┤
  │ Cache       │ orchestrator → cache-manager → getAdapter() → Redis       │
  │ Session     │ orchestrator → session-manager → getAdapter() → Redis     │
  │ PubSub      │ orchestrator → pubsub-manager → getAdapter() → Redis      │
  │ Rate limit  │ orchestrator → rate-limit-store → getAdapter() → Redis    │
  │ Keys        │ orchestrator → key-manager → key-builder.util             │
  └─────────────┴──────────────────────────────────────────────────────────┘
```

---

## 2. Adapter Pattern (No Vendor Lock-in)

The module ships with a `RedisClientAdapter` interface. You must inject a conforming adapter before calling any operation:

```typescript
import Redis from "ioredis";
import { registerAdapter, initRedis, INITIAL_STATE } from "./index.js";

// Implement the adapter for ioredis
const ioredisClient = new Redis({ host: "localhost", port: 6379 });

registerAdapter({
  connect:    async () => { await ioredisClient.connect(); },
  disconnect: async () => { await ioredisClient.quit(); },
  get:        (key) => ioredisClient.get(key),
  set:        async (key, val, ttl) => { await ioredisClient.set(key, val, "EX", ttl ?? 3600); },
  del:        async (key) => { await ioredisClient.del(key); },
  exists:     async (key) => (await ioredisClient.exists(key)) === 1,
  expire:     async (key, s) => { await ioredisClient.expire(key, s); },
  incr:       (key) => ioredisClient.incr(key),
  incrby:     (key, n) => ioredisClient.incrby(key, n),
  keys:       (pattern) => ioredisClient.keys(pattern),
  flushPattern: async (pattern) => {
    const keys = await ioredisClient.keys(pattern);
    if (keys.length) await ioredisClient.del(...keys);
    return keys.length;
  },
  publish:    (channel, msg) => ioredisClient.publish(channel, msg),
  subscribe:  async (channel, fn) => { await ioredisClient.subscribe(channel); ioredisClient.on("message", (ch, msg) => { if (ch === channel) fn(msg); }); },
  unsubscribe: async (channel) => { await ioredisClient.unsubscribe(channel); },
  isConnected: () => ioredisClient.status === "ready",
});

// Then init
const { nextState } = await initRedis({ host: "localhost", port: 6379 }, INITIAL_STATE);
```

---

## 3. Caching Strategy

```
setCache({ key, value, ttl?, namespace? }, state)
         │
         └── buildCacheKey(namespace, key, prefix)   → "nura-x:cache:users:user_123"
                  │
                  ├── serialize(value)                → JSON string
                  ├── clampTTL(ttl ?? 3600)           → bounded 1s – 30days
                  └── adapter.set(builtKey, str, ttl) → Redis SET EX

getCache(key, namespace, state)
         │
         └── buildCacheKey(namespace, key, prefix)
                  │
                  ├── adapter.get(builtKey)           → raw string | null
                  ├── HIT  → deserialize<T>(raw)      → typed object
                  └── MISS → return null

deleteCache(key, namespace, state)
         └── adapter.del(builtKey)

flushNamespace(namespace, state)
         └── adapter.flushPattern("nura-x:cache:{namespace}:*")
```

**TTL presets (`TTL` constant):**

| Key | Seconds |
|-----|---------|
| `CACHE_SHORT` | 300 (5 min) |
| `CACHE_DEFAULT` | 3600 (1 hr) |
| `CACHE_LONG` | 86400 (24 hr) |
| `SESSION_DEFAULT` | 86400 (1 day) |
| `SESSION_PERSISTENT` | 2592000 (30 days) |
| `RATE_LIMIT_MINUTE` | 60 |
| `RATE_LIMIT_HOUR` | 3600 |
| `RATE_LIMIT_DAY` | 86400 |

---

## 4. PubSub Flow

```
publishMessage(channel, payload, state)
         │
         ├── generate messageId: "msg_{ts}_{random}"
         ├── serializeMessage({ payload, ts })   → JSON string
         └── adapter.publish(channel, serialized) → receiverCount

subscribeToChannel(channel, onMessage, state)
         │
         ├── adapter.subscribe(channel, rawHandler)
         └── rawHandler(raw):
               ├── deserializeMessage(raw) → { payload, ts }
               └── onMessage({ channel, payload, timestamp })

unsubscribeFromChannel(channel, state)
         └── adapter.unsubscribe(channel)
```

---

## 5. Session Handling

```
createSession({ sessionId, userId, payload, ttl? }, state)
         │
         ├── compute expiresAt = Date.now() + ttl * 1000
         ├── buildSessionKey(sessionId, prefix)     → "nura-x:session:{sessionId}"
         ├── serializeSession({ ...data, createdAt, expiresAt })
         └── adapter.set(key, json, ttl)

validateSession(sessionId, state)
         │
         ├── getSession(sessionId) → SessionData | null
         ├── null → { valid: false }
         ├── expiresAt < now → destroySession + { valid: false }
         └── valid → { valid: true, userId }

destroySession(sessionId, state)
         └── adapter.del(buildSessionKey(sessionId))
```

---

## 6. Rate Limiting Flow

```
incrementRateLimit({ key, windowSeconds, maxRequests, namespace? }, state)
         │
         ├── buildRateLimitKey(key, namespace, prefix)
         ├── adapter.incr(builtKey)               → current count
         ├── if current === 1: adapter.expire(key, windowSeconds)   ← sliding window start
         ├── allowed = current <= maxRequests
         └── return { allowed, current, remaining, resetInSeconds }

resetRateLimit({ key, namespace }, state)
         └── adapter.del(builtKey)
```

---

## 7. Key Naming Strategy

All keys are namespaced using the pattern: `{prefix}:{domain}:{entity}:{identifier}`

| Strategy | Pattern |
|----------|---------|
| Cache | `{prefix}:cache:{namespace}:{key}` |
| Session | `{prefix}:session:{sessionId}` |
| Rate limit | `{prefix}:ratelimit:{key}` |
| PubSub | `{prefix}:pubsub:{channel}` |
| Custom | `{prefix}:{namespace}:{entity}:{identifier?}` |

Default prefix: `"nura-x"` (configurable via `RedisConfig.keyPrefix`)

---

## 8. File Responsibilities

### L0 — Foundation

| File | Responsibility |
|------|----------------|
| `types.ts` | All types: `RedisClientAdapter`, `CachePayload`, `SessionData`, `PubSubMessage`, `RateLimitEntry`, `KeyConfig`, `RedisConfig`, `RedisResponse`, state shapes. No logic. |
| `state.ts` | Immutable `RedisAgentState`, `INITIAL_STATE`, `transitionState()`. Handles addCacheKey/removeSession/addChannel etc. |

### L1 — Orchestrator

| File | Responsibility |
|------|----------------|
| `orchestrator.ts` | Routes all operations to correct agent. Exposes every public function with `_o` suffix. No business logic. |

### L2 — Agents

| File | Responsibility |
|------|----------------|
| `connection.agent.ts` | `initConnection`, `disconnectRedis` — adapter lifecycle, connection state transitions. |
| `cache-manager.agent.ts` | `setCache`, `getCache`, `deleteCache`, `flushNamespace` — TTL-gated cache R/W/D. |
| `session-manager.agent.ts` | `createSession`, `getSession`, `validateSession`, `destroySession` — expiry-aware session CRUD. |
| `pubsub-manager.agent.ts` | `publishMessage`, `subscribeToChannel`, `unsubscribeFromChannel` — message serialization + channel tracking. |
| `rate-limit-store.agent.ts` | `incrementRateLimit`, `resetRateLimit`, `getRateLimitStatus` — sliding window via INCR + EXPIRE. |
| `key-manager.agent.ts` | `buildNamespacedKey`, `buildStrategyKeys`, `listKeys`, `parseNamespacedKey` — key generation + inspection. |

### L3 — Utils

| File | Responsibility |
|------|----------------|
| `redis-client.util.ts` | Adapter registry (`registerAdapter`, `getAdapter`). Connection URL builder. Retry strategy factory. |
| `key-builder.util.ts` | All key construction helpers: `buildCacheKey`, `buildSessionKey`, `buildRateLimitKey`, `buildPubSubKey`, `buildPatternKey`, `sanitizeKey`. |
| `ttl-manager.util.ts` | TTL presets, `clampTTL`, `computeSessionExpiry`, `isExpired`, `ttlFromExpiry`, `toSeconds`. |
| `serializer.util.ts` | `serialize`/`deserialize`, `serializeSession`, `serializeMessage`, `deserializeMessage`, `isSafeToSerialize`. |
| `logger.util.ts` | `buildLog`, `buildError` — ISO-timestamp structured strings. |

---

## 9. Import Graph

```
index.ts
  └── orchestrator.ts (L1)
        ├── agents/connection.agent.ts (L2)
        │     └── utils/logger.util.ts, redis-client.util.ts (L3)
        ├── agents/cache-manager.agent.ts (L2)
        │     └── utils/logger.util.ts, key-builder.util.ts, ttl-manager.util.ts, serializer.util.ts, redis-client.util.ts (L3)
        ├── agents/session-manager.agent.ts (L2)
        │     └── utils/logger.util.ts, key-builder.util.ts, ttl-manager.util.ts, serializer.util.ts, redis-client.util.ts (L3)
        ├── agents/pubsub-manager.agent.ts (L2)
        │     └── utils/logger.util.ts, serializer.util.ts, redis-client.util.ts (L3)
        ├── agents/rate-limit-store.agent.ts (L2)
        │     └── utils/logger.util.ts, key-builder.util.ts, redis-client.util.ts (L3)
        ├── agents/key-manager.agent.ts (L2)
        │     └── utils/logger.util.ts, key-builder.util.ts, redis-client.util.ts (L3)
        ├── state.ts (L0)
        ├── types.ts (L0)
        └── utils/logger.util.ts, redis-client.util.ts (L3)
```
