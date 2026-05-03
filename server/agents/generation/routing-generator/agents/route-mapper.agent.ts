import type { Route, RouteAnalyzerResult } from '../types.js';
import { toHandlerName } from '../utils/naming.util.js';
import { filePathToRoutePath, normalizeDynamicSegments } from '../utils/path-parser.util.js';

const inferMethod = (filePath: string): Route['method'] => {
  if (/create|post/i.test(filePath)) return 'POST';
  if (/update|put/i.test(filePath)) return 'PUT';
  if (/patch/i.test(filePath)) return 'PATCH';
  if (/delete|remove/i.test(filePath)) return 'DELETE';
  return 'GET';
};

export const mapRoutes = (rootDir: string, analyzed: RouteAnalyzerResult): readonly Route[] => {
  const backendRoutes = analyzed.backendFiles.map((filePath) => {
    const routePath = normalizeDynamicSegments(filePathToRoutePath(rootDir, filePath));
    return Object.freeze({
      filePath,
      routePath,
      kind: 'backend' as const,
      method: inferMethod(filePath),
      handlerName: toHandlerName(routePath, 'api'),
    });
  });

  const frontendRoutes = analyzed.frontendFiles.map((filePath) => {
    const routePath = normalizeDynamicSegments(filePathToRoutePath(rootDir, filePath));
    return Object.freeze({
      filePath,
      routePath,
      kind: 'frontend' as const,
      method: 'GET' as const,
      handlerName: toHandlerName(routePath, 'page'),
    });
  });

  const deduped = new Map<string, Route>();
  for (const route of [...backendRoutes, ...frontendRoutes]) {
    const key = `${route.kind}:${route.method}:${route.routePath}`;
    if (!deduped.has(key)) {
      deduped.set(key, route);
    }
  }

  return Object.freeze(Array.from(deduped.values()));
};
