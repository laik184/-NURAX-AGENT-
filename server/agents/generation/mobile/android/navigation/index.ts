import { popRoute, pushRoute, replaceTopRoute } from "./agents/backstack-manager.agent.js";
import { isRouteAllowed, type GuardContext } from "./agents/guard.agent.js";
import { resolveNavigation } from "./agents/navigation-handler.agent.js";
import { buildNavigation as runBuildNavigation } from "./orchestrator.js";
import {
  createInitialState,
  withCurrentRoute,
  withDeepLinks,
  withGraph,
  withHistory,
  withRoutes,
} from "./state.js";
import type { NavigateRequest, NavigationInput, NavigationResult, Route } from "./types.js";

let runtimeState = createInitialState();

export function buildNavigation(input: NavigationInput): NavigationResult {
  const result = runBuildNavigation(input);

  if (result.success) {
    runtimeState = withRoutes(runtimeState, result.routes);
    runtimeState = withGraph(runtimeState, result.graph);
    runtimeState = withDeepLinks(runtimeState, result.deepLinks);

    if (result.graph) {
      const startDestination = result.graph.startDestination;
      runtimeState = withCurrentRoute(runtimeState, startDestination);
      runtimeState = withHistory(runtimeState, Object.freeze([startDestination]));
    }
  }

  return result;
}

export function navigateTo(request: NavigateRequest, context: GuardContext): string {
  const resolved = resolveNavigation(request, runtimeState.routes);
  const route = runtimeState.routes.find((entry) => entry.id === resolved.routeId);

  if (!route) {
    throw new Error(`Resolved route '${resolved.routeId}' not found in runtime state.`);
  }

  if (!isRouteAllowed(route, context)) {
    throw new Error(`Route '${route.id}' blocked by guard policy.`);
  }

  const nextHistory = request.replaceTop
    ? replaceTopRoute(runtimeState.history, route.id)
    : pushRoute(runtimeState.history, route.id);

  runtimeState = withCurrentRoute(runtimeState, route.id);
  runtimeState = withHistory(runtimeState, nextHistory);

  return resolved.concretePath;
}

export function navigateBack(): string {
  const nextHistory = popRoute(runtimeState.history);
  const currentRoute = nextHistory[nextHistory.length - 1] ?? "";
  runtimeState = withHistory(runtimeState, nextHistory);
  runtimeState = withCurrentRoute(runtimeState, currentRoute);
  return currentRoute;
}

export function getRoutes(): readonly Route[] {
  return runtimeState.routes;
}

export type {
  DeepLinkConfig,
  GuardCondition,
  NavGraph,
  NavigateRequest,
  NavigationInput,
  NavigationResult,
  NavigationStatus,
  Route,
  ScreenConfig,
} from "./types.js";
