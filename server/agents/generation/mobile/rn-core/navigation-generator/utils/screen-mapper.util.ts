import type { ScreenMapping } from "../types.js";

export function mapScreensToComponents(routes: readonly string[]): readonly ScreenMapping[] {
  const mappings = routes.map((route) => ({
    route,
    component: `${route}Screen`,
    title: route.replace(/([a-z0-9])([A-Z])/g, "$1 $2"),
  }));

  return Object.freeze(mappings);
}
