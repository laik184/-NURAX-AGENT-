import type { DynamicRoute, FrameworkType, Route } from './types.js';

export interface RoutingGeneratorState {
  readonly detectedFramework: FrameworkType;
  readonly routes: readonly Route[];
  readonly dynamicRoutes: readonly DynamicRoute[];
  readonly status: 'IDLE' | 'GENERATING' | 'SUCCESS' | 'FAILED';
  readonly logs: readonly string[];
  readonly errors: readonly string[];
}

export const createInitialState = (): Readonly<RoutingGeneratorState> =>
  Object.freeze({
    detectedFramework: 'unknown' as const,
    routes: [],
    dynamicRoutes: [],
    status: 'IDLE' as const,
    logs: [],
    errors: [],
  });

export const transitionState = (
  current: Readonly<RoutingGeneratorState>,
  patch: Partial<RoutingGeneratorState>,
): Readonly<RoutingGeneratorState> =>
  Object.freeze({
    detectedFramework: patch.detectedFramework ?? current.detectedFramework,
    routes: patch.routes ?? current.routes,
    dynamicRoutes: patch.dynamicRoutes ?? current.dynamicRoutes,
    status: patch.status ?? current.status,
    logs: patch.logs ?? current.logs,
    errors: patch.errors ?? current.errors,
  });
