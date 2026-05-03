import { RouterState, RouteRecord } from "./types";

const MAX_LAST_ROUTES = 100;
const MAX_FAILED_ROUTES = 50;

let _state: RouterState = Object.freeze({
  lastRoutes: Object.freeze([]),
  failedRoutes: Object.freeze([]),
  metrics: Object.freeze({
    totalRequests: 0,
    successRate: 1,
    avgConfidence: 0,
  }),
});

export function getState(): RouterState {
  return _state;
}

export function recordRoute(record: RouteRecord): RouterState {
  const lastRoutes = [..._state.lastRoutes, record].slice(-MAX_LAST_ROUTES);
  const failedRoutes = record.success
    ? [..._state.failedRoutes]
    : [..._state.failedRoutes, record].slice(-MAX_FAILED_ROUTES);

  const total = _state.metrics.totalRequests + 1;
  const successCount = lastRoutes.filter((r) => r.success).length;
  const successRate = Math.round((successCount / lastRoutes.length) * 100) / 100;
  const avgConfidence =
    Math.round(
      (lastRoutes.reduce((sum, r) => sum + r.confidence, 0) / lastRoutes.length) * 100
    ) / 100;

  _state = Object.freeze({
    lastRoutes: Object.freeze(lastRoutes),
    failedRoutes: Object.freeze(failedRoutes),
    metrics: Object.freeze({ totalRequests: total, successRate, avgConfidence }),
  });

  return _state;
}

export function getMetrics() {
  return _state.metrics;
}

export function getRecentRoutes(limit = 10): readonly RouteRecord[] {
  return _state.lastRoutes.slice(-limit);
}
