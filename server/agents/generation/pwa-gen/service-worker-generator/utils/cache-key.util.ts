import type { SWConfig } from "../types.js";

export function buildCacheKey(config: SWConfig): string {
  return `${config.cacheName}-${config.version}`;
}
