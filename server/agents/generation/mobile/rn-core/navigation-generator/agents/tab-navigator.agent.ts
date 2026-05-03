import type { HvpContract } from "../types.js";

const TAB_ICON_MAP: Record<string, string> = Object.freeze({
  Home: "home",
  Search: "search",
  Profile: "person",
  Settings: "settings",
});

export function generateTabNavigator(routes: readonly string[]): HvpContract {
  const tabCandidates = routes.filter((route) => ["Home", "Search", "Profile", "Settings"].includes(route));
  const tabs = (tabCandidates.length > 0 ? tabCandidates : routes.slice(0, Math.min(4, routes.length))).map((route) =>
    Object.freeze({
      name: route,
      label: route,
      icon: TAB_ICON_MAP[route] ?? "ellipse",
    }),
  );

  return Object.freeze({
    success: true,
    logs: Object.freeze([`Tab navigator generated with ${tabs.length} tabs.`]),
    data: Object.freeze({
      type: "tabs",
      tabs: Object.freeze(tabs),
      switching: "navigation.navigate(tabName)",
    }),
  });
}
