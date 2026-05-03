import { createCacheKey } from '../utils/cache-key.util.js';
import { cloneResponseSafely } from '../utils/response-cloner.util.js';

interface Input {
  readonly request: { readonly url: string; readonly method: string };
  readonly context: { readonly networkAvailable: boolean; readonly cacheKeys: readonly string[] };
}

export const runCacheFirstStrategy = (input: Input) => {
  const cacheKey = createCacheKey(input.request.method, input.request.url);
  const cached = input.context.cacheKeys.includes(cacheKey);

  if (cached) {
    return cloneResponseSafely({
      success: true,
      strategy: 'cache-first' as const,
      fromCache: true,
      fallbackUsed: false,
      logs: [`cache-first: cache hit for ${cacheKey}`],
    });
  }

  if (input.context.networkAvailable) {
    return cloneResponseSafely({
      success: true,
      strategy: 'cache-first' as const,
      fromCache: false,
      fallbackUsed: false,
      logs: [`cache-first: network fallback hit for ${cacheKey}`],
    });
  }

  return cloneResponseSafely({
    success: false,
    strategy: 'cache-first' as const,
    fromCache: false,
    fallbackUsed: false,
    logs: [`cache-first: miss for ${cacheKey}`],
    error: 'Cache miss and network unavailable',
  });
};
