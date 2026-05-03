export const ROUTE_PARAM_REGEX = /\{([a-zA-Z0-9_]+)\}/g;

export const DEFAULT_START_FALLBACK = "home";

export const LOG_SCOPE = {
  orchestrator: "android-navigation:orchestrator",
  routeGenerator: "android-navigation:route-generator",
  navGraphBuilder: "android-navigation:navgraph-builder",
  deepLink: "android-navigation:deep-link",
  guard: "android-navigation:guard",
  navigationHandler: "android-navigation:navigation-handler",
  backstackManager: "android-navigation:backstack-manager",
  validation: "android-navigation:validation",
} as const;
