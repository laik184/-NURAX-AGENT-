import type { BreakpointName, Breakpoints } from "../types.js";
import { buildMinWidthMediaQuery } from "../utils/media-query-builder.util.js";

export function mapResponsiveStyles(
  breakpoints: Breakpoints,
  activeBreakpoint: BreakpointName,
): Readonly<Record<string, Readonly<Record<string, string>>>> {
  const base = Object.freeze({ fontSize: "0.875rem", gap: "0.75rem" });
  const tablet = Object.freeze({ fontSize: "1rem", gap: "1rem" });
  const desktop = Object.freeze({ fontSize: "1.125rem", gap: "1.25rem" });

  return Object.freeze({
    base,
    [buildMinWidthMediaQuery(breakpoints, "tablet")]: tablet,
    [buildMinWidthMediaQuery(breakpoints, "desktop")]: desktop,
    active: Object.freeze({ current: activeBreakpoint }),
  });
}
