import { generateAuthNavigator } from "./agents/auth-navigator.agent.js";
import { generateDeepLinkConfig } from "./agents/deep-link.agent.js";
import { generateDrawerNavigator } from "./agents/drawer-navigator.agent.js";
import { generateStackNavigator } from "./agents/stack-navigator.agent.js";
import { generateTabNavigator } from "./agents/tab-navigator.agent.js";
import { navigationState } from "./state.js";
import type { HvpContract, NavigationInput } from "./types.js";
import {
  buildNavigationOutput,
  normalizeNavigationInput,
  validateNavigationInput,
} from "./utils/navigation-config.util.js";
import { normalizeRoutes } from "./utils/route-normalizer.util.js";
import { mapScreensToComponents } from "./utils/screen-mapper.util.js";

export function runNavigationGenerator(input: NavigationInput): HvpContract {
  const logs: string[] = [];

  const validationResult = validateNavigationInput(input);
  logs.push(...validationResult.logs);
  if (!validationResult.success) {
    return Object.freeze({
      success: false,
      logs: Object.freeze(logs),
      error: validationResult.error,
    });
  }

  const normalizedInput = normalizeNavigationInput(input);
  logs.push("Input normalized for optional flags.");

  const routes = normalizeRoutes(normalizedInput.screens);
  logs.push(`Routes normalized: ${routes.join(", ")}.`);

  const mapping = mapScreensToComponents(routes);
  logs.push(`Screen mapping created for ${mapping.length} routes.`);

  const initialRoute = routes[0] ?? navigationState.initialRoute;

  const stack = generateStackNavigator(mapping, initialRoute);
  logs.push(...stack.logs);

  const tabs = generateTabNavigator(routes);
  logs.push(...tabs.logs);

  const drawer = generateDrawerNavigator(routes);
  logs.push(...drawer.logs);

  const auth = generateAuthNavigator(normalizedInput.authEnabled, initialRoute);
  logs.push(...auth.logs);

  const deepLinks = generateDeepLinkConfig(routes, normalizedInput.deepLinking);
  logs.push(...deepLinks.logs);

  const output = buildNavigationOutput({
    stack: stack.data,
    tabs: tabs.data,
    drawer: drawer.data,
    auth: auth.data,
    deepLinks: deepLinks.data,
  });

  return Object.freeze({
    success: true,
    logs: Object.freeze(logs),
    data: Object.freeze({
      output,
      auth: auth.data,
      state: Object.freeze({
        routes,
        authRequired: normalizedInput.authEnabled,
        initialRoute,
      }),
    }),
  });
}
