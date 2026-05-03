import type { ControllerConfig, RouteDefinition } from "../types.js";

const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);

export function mapRoutes(config: ControllerConfig): readonly RouteDefinition[] {
  return Object.freeze(
    config.routes.map((route) => ({
      ...route,
      method: HTTP_METHODS.has(route.method) ? route.method : "GET",
      path: route.path.startsWith("/") ? route.path : `/${route.path}`,
    })),
  );
}
