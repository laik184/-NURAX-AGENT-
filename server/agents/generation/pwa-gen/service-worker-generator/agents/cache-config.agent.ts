import type { CacheConfigResult, SWConfig } from "../types.js";
import { buildCacheKey } from "../utils/cache-key.util.js";

export function runCacheConfigAgent(config: SWConfig): Readonly<CacheConfigResult> {
  const versionedCacheName = buildCacheKey(config);
  const staleCachesToDelete = Object.freeze([`${config.cacheName}-legacy`]);

  return Object.freeze({
    versionedCacheName,
    staleCachesToDelete,
    logs: Object.freeze([
      `cache-config: computed versioned cache name ${versionedCacheName}`,
      "cache-config: prepared stale cache invalidation list",
    ]),
  });
}
