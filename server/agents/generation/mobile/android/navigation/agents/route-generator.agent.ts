import type { Route, ScreenConfig } from "../types.js";
import { parseRoutePath } from "../utils/route-parser.util.js";

export function generateRoutes(screens: readonly ScreenConfig[]): readonly Route[] {
  const routes = screens.map((screen) => {
    const parsed = parseRoutePath(screen.path);
    const screenParams = new Set(screen.params ?? []);

    for (const param of parsed.params) {
      screenParams.add(param);
    }

    return Object.freeze({
      id: `${screen.id}.route`,
      screenId: screen.id,
      path: parsed.normalizedPath,
      args: Object.freeze([...screenParams]),
      guard: screen.guard ?? "NONE",
    });
  });

  return Object.freeze(routes);
}
