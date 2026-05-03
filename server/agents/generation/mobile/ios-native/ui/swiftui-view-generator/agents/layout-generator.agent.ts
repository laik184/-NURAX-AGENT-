import type { LayoutConfig } from "../types.js";
import { indentLines } from "../utils/swift-syntax.util.js";

export function generateLayout(layout: Readonly<LayoutConfig>, content: string): string {
  const spacing = layout.spacing ?? 12;
  const alignment = layout.alignment ? `, alignment: .${layout.alignment}` : "";

  return [
    `${layout.type}(spacing: ${spacing}${alignment}) {`,
    indentLines(content),
    "}",
  ].join("\n");
}
