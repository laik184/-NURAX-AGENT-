import type { Route, ScreenConfig } from "../types.js";

export function validateScreens(screens: readonly ScreenConfig[]): readonly string[] {
  const errors: string[] = [];
  const ids = new Set<string>();

  if (!screens.length) {
    errors.push("At least one screen must be provided.");
    return Object.freeze(errors);
  }

  for (const screen of screens) {
    if (!screen.id.trim()) {
      errors.push("Screen id is required.");
    }

    if (!screen.path.trim()) {
      errors.push(`Screen '${screen.id}' is missing a path.`);
    }

    if (ids.has(screen.id)) {
      errors.push(`Duplicate screen id detected: '${screen.id}'.`);
    }

    ids.add(screen.id);
  }

  return Object.freeze(errors);
}

export function validateRoutes(routes: readonly Route[]): readonly string[] {
  const errors: string[] = [];
  const routeIds = new Set<string>();

  for (const route of routes) {
    if (routeIds.has(route.id)) {
      errors.push(`Duplicate route id detected: '${route.id}'.`);
    }

    routeIds.add(route.id);

    if (!route.path.trim()) {
      errors.push(`Route '${route.id}' has an empty path.`);
    }
  }

  return Object.freeze(errors);
}
