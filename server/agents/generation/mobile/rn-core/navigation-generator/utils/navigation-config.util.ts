import type {
  HvpContract,
  NavigationConfigInput,
  NavigationInput,
  NavigationOutput,
  NormalizedNavigationInput,
} from "../types.js";

export function validateNavigationInput(input: NavigationInput): HvpContract {
  if (!Array.isArray(input.screens) || input.screens.length === 0) {
    return Object.freeze({
      success: false,
      logs: Object.freeze(["Input validation failed: screens[] is required."]),
      error: "Invalid input: screens must be a non-empty array.",
    });
  }

  return Object.freeze({
    success: true,
    logs: Object.freeze(["Input validated successfully."]),
  });
}

export function normalizeNavigationInput(input: NavigationInput): NormalizedNavigationInput {
  return Object.freeze({
    screens: Object.freeze([...input.screens]),
    authEnabled: input.authEnabled ?? false,
    deepLinking: input.deepLinking ?? true,
  });
}

export function buildNavigationOutput(config: NavigationConfigInput): NavigationOutput {
  const output: NavigationOutput = {
    stack: config.stack,
    tabs: config.tabs,
    drawer: config.drawer,
  };

  if (config.deepLinks) {
    output.deepLinks = config.deepLinks;
  }

  return Object.freeze(output);
}
