import type { BreakpointName, Breakpoints } from "../types.js";

const DEFAULT_BREAKPOINTS: Breakpoints = Object.freeze({
  mobile: 0,
  tablet: 768,
  desktop: 1200,
});

export function defineBreakpoints(): Breakpoints {
  return DEFAULT_BREAKPOINTS;
}

export function detectBreakpoint(width: number, breakpoints: Breakpoints): BreakpointName {
  if (width >= breakpoints.desktop) {
    return "desktop";
  }

  if (width >= breakpoints.tablet) {
    return "tablet";
  }

  return "mobile";
}
