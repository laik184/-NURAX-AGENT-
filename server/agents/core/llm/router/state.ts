import type { RouterState, RoutingDecision } from "./types.js";

let routerState: RouterState = Object.freeze({
  lastSelectedProvider: "",
  requestHistory:       Object.freeze([]),
  fallbackCount:        0,
  avgLatency:           0,
  costStats:            Object.freeze({}),
});

export function getRouterState(): RouterState {
  return routerState;
}

export function updateRouterState(next: RouterState): void {
  routerState = Object.freeze({
    ...next,
    requestHistory: Object.freeze([...next.requestHistory]),
    costStats:      Object.freeze({ ...next.costStats }),
  });
}

export function appendRequestHistory(decision: RoutingDecision): RouterState {
  const current = getRouterState();
  const nextHistory = Object.freeze([...current.requestHistory, Object.freeze(decision)]);
  const nextState: RouterState = {
    ...current,
    requestHistory: nextHistory,
  };
  updateRouterState(nextState);
  return getRouterState();
}
