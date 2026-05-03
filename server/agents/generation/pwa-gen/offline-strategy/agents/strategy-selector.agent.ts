import { classifyRoute } from '../utils/route-matcher.util.js';

export const selectStrategyForRoute = (url: string): 'network-first' | 'cache-first' | 'stale-while-revalidate' => {
  const routeType = classifyRoute(url);

  if (routeType === 'api') {
    return 'network-first';
  }

  if (routeType === 'assets') {
    return 'cache-first';
  }

  return 'stale-while-revalidate';
};
