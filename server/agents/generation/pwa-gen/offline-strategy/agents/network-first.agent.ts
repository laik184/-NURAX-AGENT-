import { createCacheKey } from '../utils/cache-key.util.js';
import { cloneResponseSafely } from '../utils/response-cloner.util.js';

interface Input {
  readonly request: { readonly url: string; readonly method: string };
  readonly context: { readonly networkAvailable: boolean; readonly cacheKeys: readonly string[] };
}

export const runNetworkFirstStrategy = (input: Input) => {
  const cacheKey = createCacheKey(input.request.method, input.request.url);

  if (input.context.networkAvailable) {
    return cloneResponseSafely({
      success: true,
      strategy: 'network-first' as const,
      fromCache: false,
      fallbackUsed: false,
      logs: [`network-first: network hit for ${cacheKey}`],
    });
  }

  const fromCache = input.context.cacheKeys.includes(cacheKey);

  if (fromCache) {
    return cloneResponseSafely({
      success: true,
      strategy: 'network-first' as const,
      fromCache: true,
      fallbackUsed: false,
      logs: [`network-first: cache fallback hit for ${cacheKey}`],
    });
  }

  return cloneResponseSafely({
    success: false,
    strategy: 'network-first' as const,
    fromCache: false,
    fallbackUsed: false,
    logs: [`network-first: miss for ${cacheKey}`],
    error: 'Network unavailable and cache miss',
  });
};
