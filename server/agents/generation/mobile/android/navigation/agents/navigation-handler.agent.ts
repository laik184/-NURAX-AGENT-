import type { NavigateRequest, Route } from "../types.js";
import { mapRouteParams } from "../utils/param-mapper.util.js";

export interface NavigationActionResult {
  readonly routeId: string;
  readonly concretePath: string;
}

export function resolveNavigation(
  request: NavigateRequest,
  routes: readonly Route[],
): NavigationActionResult {
  const targetRoute = routes.find(
    (route) => route.id === request.target || route.screenId === request.target,
  );

  if (!targetRoute) {
    throw new Error(`Unable to navigate. Unknown route target '${request.target}'.`);
  }

  const concretePath = mapRouteParams(targetRoute.path, request.params);

  return Object.freeze({
    routeId: targetRoute.id,
    concretePath,
  });
}
