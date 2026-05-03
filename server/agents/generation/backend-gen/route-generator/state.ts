import type { GeneratedRoute, RouteGeneratorState, SupportedFramework } from "./types";

export const createRouteGeneratorState = (
  framework: SupportedFramework,
): RouteGeneratorState => ({
  routes: [],
  framework,
  generatedFiles: [],
  status: "IDLE",
  logs: [],
  errors: [],
});

export const withStatus = (
  state: RouteGeneratorState,
  status: RouteGeneratorState["status"],
): RouteGeneratorState => ({
  ...state,
  status,
});

export const withLog = (state: RouteGeneratorState, log: string): RouteGeneratorState => ({
  ...state,
  logs: [...state.logs, log],
});

export const withRoutes = (
  state: RouteGeneratorState,
  routes: GeneratedRoute[],
): RouteGeneratorState => ({
  ...state,
  routes,
});

export const withGeneratedFiles = (
  state: RouteGeneratorState,
  files: string[],
): RouteGeneratorState => ({
  ...state,
  generatedFiles: files,
});

export const withError = (
  state: RouteGeneratorState,
  error: string,
): RouteGeneratorState => ({
  ...state,
  errors: [...state.errors, error],
});
