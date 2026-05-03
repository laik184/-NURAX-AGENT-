import type { HvpContract } from "../types.js";

export function generateDeepLinkConfig(routes: readonly string[], enabled: boolean): HvpContract {
  if (!enabled) {
    return Object.freeze({
      success: true,
      logs: Object.freeze(["Deep linking disabled by input configuration."]),
      data: undefined,
    });
  }

  const screens = routes.reduce<Record<string, string>>((acc, route) => {
    acc[route] = route.toLowerCase();
    return acc;
  }, {});

  return Object.freeze({
    success: true,
    logs: Object.freeze([`Deep link config generated for ${routes.length} routes.`]),
    data: Object.freeze({
      prefixes: Object.freeze(["app://", "https://app.example.com"]),
      config: Object.freeze({
        screens: Object.freeze(screens),
      }),
      externalHandling: "Linking.addEventListener('url', handler)",
    }),
  });
}
