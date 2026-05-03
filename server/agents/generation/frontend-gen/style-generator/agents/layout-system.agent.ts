import type { BreakpointName, LayoutSystem } from "../types.js";

export function buildLayoutSystem(activeBreakpoint: BreakpointName): LayoutSystem {
  if (activeBreakpoint === "desktop") {
    return Object.freeze({
      containerMaxWidth: "72rem",
      columns: 12,
      gutter: "1.5rem",
      display: "grid",
    });
  }

  if (activeBreakpoint === "tablet") {
    return Object.freeze({
      containerMaxWidth: "56rem",
      columns: 8,
      gutter: "1rem",
      display: "grid",
    });
  }

  return Object.freeze({
    containerMaxWidth: "100%",
    columns: 4,
    gutter: "0.75rem",
    display: "flex",
  });
}
