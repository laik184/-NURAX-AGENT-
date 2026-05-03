import { runCacheFirstStrategy } from './agents/cache-first.agent.js';
import { runNetworkFirstStrategy } from './agents/network-first.agent.js';
import { buildOfflineFallback } from './agents/offline-page.agent.js';
import { runStaleWhileRevalidateStrategy } from './agents/stale-while-revalidate.agent.js';
import { selectStrategyForRoute } from './agents/strategy-selector.agent.js';
import type { OfflineStrategyInput, OfflineStrategyOutput, StrategyExecutionResult, StrategyType } from './types.js';

const strategyExecutors: Readonly<Record<StrategyType, (input: OfflineStrategyInput) => StrategyExecutionResult>> = Object.freeze({
  'network-first': runNetworkFirstStrategy,
  'cache-first': runCacheFirstStrategy,
  'stale-while-revalidate': runStaleWhileRevalidateStrategy,
});

const toOutput = (result: StrategyExecutionResult): OfflineStrategyOutput =>
  Object.freeze({
    success: result.success,
    logs: Object.freeze([...result.logs]),
    ...(result.error ? { error: result.error } : {}),
  });

export const executeOfflineStrategy = (input: OfflineStrategyInput): OfflineStrategyOutput => {
  const strategy = selectStrategyForRoute(input.request.url);
  const result = strategyExecutors[strategy](input);

  if (result.success) {
    return toOutput(result);
  }

  const fallback = buildOfflineFallback(strategy);
  const fallbackResult: StrategyExecutionResult = {
    ...fallback,
    logs: Object.freeze([...result.logs, ...fallback.logs]),
    error: result.error,
  };

  return toOutput(fallbackResult);
};
