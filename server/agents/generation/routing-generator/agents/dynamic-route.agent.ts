import type { DynamicRoute, Route } from '../types.js';

const paramRegex = /:([a-zA-Z_][a-zA-Z0-9_]*)\*?/g;

export const extractDynamicRoutes = (routes: readonly Route[]): readonly DynamicRoute[] => {
  const dynamicRoutes: DynamicRoute[] = [];

  for (const route of routes) {
    const params = Array.from(route.routePath.matchAll(paramRegex)).map((match) => match[1]);
    if (params.length === 0) {
      continue;
    }

    dynamicRoutes.push(
      Object.freeze({
        sourcePath: route.filePath,
        routePath: route.routePath,
        params: Object.freeze(params),
        queryParams: Object.freeze([]),
      }),
    );
  }

  return Object.freeze(dynamicRoutes);
};
