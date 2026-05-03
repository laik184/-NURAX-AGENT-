import type { DynamicRoute, Route, ValidationResult } from '../types.js';

const isValidPath = (routePath: string): boolean => /^\/(|[a-zA-Z0-9_\-/:*]+)$/.test(routePath);

export const validateRoutes = (routes: readonly Route[], dynamicRoutes: readonly DynamicRoute[]): Readonly<ValidationResult> => {
  const logs: string[] = [];
  const seen = new Set<string>();

  for (const route of routes) {
    const key = `${route.kind}:${route.method ?? 'GET'}:${route.routePath}`;
    if (seen.has(key)) {
      return Object.freeze({
        valid: false,
        logs: Object.freeze([...logs, `Duplicate route detected: ${key}`]),
        error: `Duplicate route detected: ${key}`,
      });
    }

    if (!isValidPath(route.routePath)) {
      return Object.freeze({
        valid: false,
        logs: Object.freeze([...logs, `Invalid route path: ${route.routePath}`]),
        error: `Invalid route path: ${route.routePath}`,
      });
    }

    seen.add(key);
  }

  for (const dynamicRoute of dynamicRoutes) {
    if (dynamicRoute.params.length === 0) {
      return Object.freeze({
        valid: false,
        logs: Object.freeze([...logs, `Dynamic route missing params: ${dynamicRoute.routePath}`]),
        error: `Dynamic route missing params: ${dynamicRoute.routePath}`,
      });
    }
  }

  logs.push(`Validated ${routes.length} routes and ${dynamicRoutes.length} dynamic routes.`);

  return Object.freeze({
    valid: true,
    logs: Object.freeze(logs),
  });
};
