import { AppShellInput, HydrationPlan } from '../types.js';

const resolveMode = (input: AppShellInput): HydrationPlan['mode'] => {
  if (input.performanceTargets.interactiveMs <= 1500) {
    return 'islands';
  }

  if (input.loadingStrategy === 'aggressive') {
    return 'selective';
  }

  return 'full';
};

export const hydrationStrategyAgent = (input: AppShellInput): HydrationPlan => {
  const mode = resolveMode(input);

  const bootstrap = input.routes.map((route) => {
    const strategy: 'immediate' | 'idle' | 'visible' =
      route.priority === 'critical' ? 'immediate' : mode === 'islands' ? 'visible' : 'idle';

    return Object.freeze({ selector: `[data-route="${route.path}"]`, strategy });
  });

  const deferredBoundaries = input.routes
    .filter((route) => route.priority === 'deferred')
    .map((route) => route.path);

  return Object.freeze({
    mode,
    bootstrap: Object.freeze(bootstrap),
    deferredBoundaries: Object.freeze(deferredBoundaries),
  });
};
