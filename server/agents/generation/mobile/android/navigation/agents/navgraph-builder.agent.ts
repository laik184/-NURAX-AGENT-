import type { NavGraph, Route, ScreenConfig } from "../types.js";
import { DEFAULT_START_FALLBACK } from "../utils/nav-constants.util.js";

export function buildNavGraph(
  routes: readonly Route[],
  screens: readonly ScreenConfig[],
): NavGraph {
  const startScreen = screens.find((screen) => screen.startDestination) ?? screens[0];
  const startRoute = routes.find((route) => route.screenId === startScreen?.id);

  const destinations = routes.map((route) => {
    const matchingScreen = screens.find((screen) => screen.id === route.screenId);
    return Object.freeze({
      routeId: route.id,
      path: route.path,
      args: route.args,
      deepLinks: Object.freeze([...(matchingScreen?.deepLinks ?? [])]),
      guard: route.guard,
    });
  });

  return Object.freeze({
    startDestination: startRoute?.id ?? `${DEFAULT_START_FALLBACK}.route`,
    destinations: Object.freeze(destinations),
  });
}
