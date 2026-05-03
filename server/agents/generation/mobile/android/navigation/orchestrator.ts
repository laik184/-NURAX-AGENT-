import { buildNavGraph } from "./agents/navgraph-builder.agent.js";
import { createDeepLinks } from "./agents/deep-link.agent.js";
import { applyDefaultGuards } from "./agents/guard.agent.js";
import { generateRoutes } from "./agents/route-generator.agent.js";
import {
  appendError,
  appendLog,
  createInitialState,
  withDeepLinks,
  withGraph,
  withRoutes,
  withStatus,
} from "./state.js";
import type { NavigationInput, NavigationResult } from "./types.js";
import { LOG_SCOPE } from "./utils/nav-constants.util.js";
import { validateRoutes, validateScreens } from "./utils/validation.util.js";
import { createErrorLog, createLog } from "./utils/logger.util.js";

export function buildNavigation(input: NavigationInput): NavigationResult {
  let state = createInitialState();

  try {
    state = withStatus(state, "BUILDING");
    state = appendLog(state, createLog(LOG_SCOPE.orchestrator, "Navigation build started."));

    const screenErrors = validateScreens(input.screens);
    if (screenErrors.length) {
      throw new Error(screenErrors.join(" | "));
    }

    const routes = generateRoutes(input.screens);
    const routeErrors = validateRoutes(routes);
    if (routeErrors.length) {
      throw new Error(routeErrors.join(" | "));
    }

    const guardedRoutes = applyDefaultGuards(routes);
    state = withRoutes(state, guardedRoutes);
    state = appendLog(state, createLog(LOG_SCOPE.routeGenerator, "Routes generated."));

    const graph = buildNavGraph(guardedRoutes, input.screens);
    state = withGraph(state, graph);
    state = appendLog(state, createLog(LOG_SCOPE.navGraphBuilder, "Navigation graph built."));

    const deepLinks = createDeepLinks(guardedRoutes, input.screens);
    state = withDeepLinks(state, deepLinks);
    state = appendLog(state, createLog(LOG_SCOPE.deepLink, "Deep links attached."));

    state = appendLog(state, createLog(LOG_SCOPE.guard, "Route guards configured."));
    state = withStatus(state, "READY");

    const output: NavigationResult = {
      success: true,
      graph: state.graph,
      routes: state.routes,
      deepLinks: state.deepLinks,
      logs: state.logs,
    };

    return Object.freeze(output);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown android-navigation failure.";
    state = appendError(state, createErrorLog(LOG_SCOPE.orchestrator, message));
    state = withStatus(state, "ERROR");

    return Object.freeze({
      success: false,
      graph: state.graph,
      routes: state.routes,
      deepLinks: state.deepLinks,
      logs: state.logs,
      error: message,
    } satisfies NavigationResult);
  }
}
