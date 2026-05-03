import { cloneResponseSafely } from '../utils/response-cloner.util.js';

export const buildOfflineFallback = (strategy: 'network-first' | 'cache-first' | 'stale-while-revalidate') =>
  cloneResponseSafely({
    success: true,
    strategy,
    fromCache: false,
    fallbackUsed: true,
    logs: ['offline-page: served /offline.html fallback'],
  });
