import type { DeepLinkConfig, Route, ScreenConfig } from "../types.js";

export function createDeepLinks(
  routes: readonly Route[],
  screens: readonly ScreenConfig[],
): readonly DeepLinkConfig[] {
  const byScreen = new Map(screens.map((screen) => [screen.id, screen]));
  const deepLinks: DeepLinkConfig[] = [];

  for (const route of routes) {
    const screen = byScreen.get(route.screenId);
    for (const uriPattern of screen?.deepLinks ?? []) {
      deepLinks.push(Object.freeze({ routeId: route.id, uriPattern }));
    }
  }

  return Object.freeze(deepLinks);
}
