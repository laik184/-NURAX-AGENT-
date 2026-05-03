import type { HvpContract } from "../types.js";

export function generateDrawerNavigator(routes: readonly string[]): HvpContract {
  const drawerItems = routes.map((route) =>
    Object.freeze({
      label: route,
      route,
    }),
  );

  return Object.freeze({
    success: true,
    logs: Object.freeze([`Drawer navigator generated with ${drawerItems.length} menu items.`]),
    data: Object.freeze({
      type: "drawer",
      items: Object.freeze(drawerItems),
    }),
  });
}
