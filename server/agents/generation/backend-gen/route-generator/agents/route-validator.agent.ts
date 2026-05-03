import type { GeneratedRoute } from "../types";

export interface RouteValidationResult {
  valid: boolean;
  errors: string[];
}

export const validateRoutes = (routes: GeneratedRoute[]): RouteValidationResult => {
  const errors: string[] = [];
  const uniqueKeys = new Set<string>();
  const routeNames = new Set<string>();

  for (const route of routes) {
    const uniqueKey = `${route.method}:${route.normalizedPath}`;

    if (uniqueKeys.has(uniqueKey)) {
      errors.push(`Duplicate route detected: ${uniqueKey}`);
    }
    uniqueKeys.add(uniqueKey);

    if (routeNames.has(route.routeName)) {
      errors.push(`Route naming conflict detected: ${route.routeName}`);
    }
    routeNames.add(route.routeName);

    if (!route.frameworkCode) {
      errors.push(`Missing framework code for route: ${route.routeName}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
