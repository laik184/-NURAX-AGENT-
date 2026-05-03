import type { GeneratedRoute, SupportedFramework } from "../types";
import { renderRouteTemplate } from "../utils/route-template.util";

export const applyFrameworkAdapter = (
  framework: SupportedFramework,
  routes: GeneratedRoute[],
): GeneratedRoute[] =>
  routes.map((route) => ({
    ...route,
    frameworkCode: renderRouteTemplate(
      framework,
      route.endpoint,
      route.method,
      route.normalizedPath,
    ),
  }));
