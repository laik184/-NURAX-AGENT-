import type { BreakpointName, Breakpoints } from "../types.js";

export function buildMinWidthMediaQuery(
  breakpoints: Breakpoints,
  breakpoint: BreakpointName,
): string {
  return `@media (min-width: ${breakpoints[breakpoint]}px)`;
}
