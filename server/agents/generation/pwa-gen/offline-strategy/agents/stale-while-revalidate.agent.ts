import { createCacheKey } from '../utils/cache-key.util.js';
import { cloneResponseSafely } from '../utils/response-cloner.util.js';

interface Input {
  readonly request: { readonly url: string; readonly method: string };
  readonly context: { readonly networkAvailable: boolean; readonly cacheKeys: readonly string[] };
}

export const runStaleWhileRevalidateStrategy = (input: Input) => {
  const cacheKey = createCacheKey(input.request.method, input.request.url);
  const cached = input.context.cacheKeys.includes(cacheKey);

  if (cached) {
    return cloneResponseSafely({
      success: true,
      strategy: 'stale-while-revalidate' as const,
      fromCache: true,
      fallbackUsed: false,
      logs: [
        `stale-while-revalidate: immediate cache response for ${cacheKey}`,
        input.context.networkAvailable
          ? `stale-while-revalidate: background refresh scheduled for ${cacheKey}`
          : `stale-while-revalidate: refresh skipped (offline) for ${cacheKey}`,
      ],
    });
  }

  if (input.context.networkAvailable) {
    return cloneResponseSafely({
      success: true,
      strategy: 'stale-while-revalidate' as const,
      fromCache: false,
      fallbackUsed: false,
      logs: [`stale-while-revalidate: network response for ${cacheKey}`],
    });
  }

  return cloneResponseSafely({
    success: false,
    strategy: 'stale-while-revalidate' as const,
    fromCache: false,
    fallbackUsed: false,
    logs: [`stale-while-revalidate: miss for ${cacheKey}`],
    error: 'No cached page and network unavailable',
  });
};
