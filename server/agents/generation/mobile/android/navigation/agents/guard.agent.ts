import type { Route } from "../types.js";

export interface GuardContext {
  readonly isAuthenticated: boolean;
  readonly permissions: readonly string[];
}

export function isRouteAllowed(route: Route, context: GuardContext): boolean {
  if (route.guard === "NONE") {
    return true;
  }

  if (route.guard === "AUTH_REQUIRED") {
    return context.isAuthenticated;
  }

  return context.permissions.length > 0;
}

export function applyDefaultGuards(routes: readonly Route[]): readonly Route[] {
  return Object.freeze([...routes]);
}
