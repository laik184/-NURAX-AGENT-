import type { BreakpointName, StyleRuntimeState, ThemeMode } from "./types.js";

const INITIAL_STATE: StyleRuntimeState = Object.freeze({
  activeThemeMode: "light",
  activeBreakpoint: "mobile",
});

export function createStyleGeneratorState(
  activeThemeMode: ThemeMode,
  activeBreakpoint: BreakpointName,
): StyleRuntimeState {
  return Object.freeze({ activeThemeMode, activeBreakpoint });
}

export function getInitialStyleGeneratorState(): StyleRuntimeState {
  return INITIAL_STATE;
}
