import type { HvpContract, ScreenMapping } from "../types.js";

export function generateStackNavigator(mapping: readonly ScreenMapping[], initialRoute: string): HvpContract {
  const screens = mapping.map((item) =>
    Object.freeze({
      name: item.route,
      component: item.component,
      options: Object.freeze({
        title: item.title,
        headerShown: true,
      }),
    }),
  );

  return Object.freeze({
    success: true,
    logs: Object.freeze([`Stack navigator generated with ${screens.length} screens.`]),
    data: Object.freeze({
      type: "stack",
      initialRouteName: initialRoute,
      screens: Object.freeze(screens),
      flow: Object.freeze({
        push: "navigation.push(routeName)",
        pop: "navigation.goBack()",
      }),
    }),
  });
}
