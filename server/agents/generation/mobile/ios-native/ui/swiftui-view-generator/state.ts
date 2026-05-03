import type { ComponentConfig, LayoutConfig, NavigationConfig } from "./types.js";

export type SwiftUIViewGeneratorStatus = "IDLE" | "GENERATING" | "DONE" | "FAILED";

export type SwiftUIViewGeneratorState = {
  readonly screenName: string;
  readonly components: readonly ComponentConfig[];
  readonly layout: Readonly<LayoutConfig>;
  readonly navigation: Readonly<NavigationConfig>;
  readonly generatedCode: string;
  readonly status: SwiftUIViewGeneratorStatus;
  readonly logs: readonly string[];
  readonly errors: readonly string[];
};

export function createInitialState(screenName: string): SwiftUIViewGeneratorState {
  return Object.freeze({
    screenName,
    components: Object.freeze([]),
    layout: Object.freeze({ type: "VStack" as const }),
    navigation: Object.freeze({ useNavigationStack: true, useNavigationLinks: true }),
    generatedCode: "",
    status: "IDLE" as const,
    logs: Object.freeze([]),
    errors: Object.freeze([]),
  });
}

export function updateState(
  state: Readonly<SwiftUIViewGeneratorState>,
  patch: Partial<SwiftUIViewGeneratorState>,
): SwiftUIViewGeneratorState {
  return Object.freeze({
    ...state,
    ...patch,
    components: Object.freeze([...(patch.components ?? state.components)]),
    layout: Object.freeze({ ...(patch.layout ?? state.layout) }),
    navigation: Object.freeze({ ...(patch.navigation ?? state.navigation) }),
    logs: Object.freeze([...(patch.logs ?? state.logs)]),
    errors: Object.freeze([...(patch.errors ?? state.errors)]),
  });
}

export function addLog(state: Readonly<SwiftUIViewGeneratorState>, message: string): SwiftUIViewGeneratorState {
  return updateState(state, { logs: [...state.logs, message] });
}

export function addError(state: Readonly<SwiftUIViewGeneratorState>, message: string): SwiftUIViewGeneratorState {
  return updateState(state, { errors: [...state.errors, message] });
}
