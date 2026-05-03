import type { LayoutConfig } from "../types.js";

type LayoutShell = {
  readonly openingLine: string;
  readonly closingLine: string;
};

function buildLayoutArguments(layout: Readonly<LayoutConfig>): string {
  const argumentParts: string[] = [];

  if (layout.alignment) {
    argumentParts.push(`alignment: .${layout.alignment}`);
  }

  if (typeof layout.spacing === "number") {
    argumentParts.push(`spacing: ${layout.spacing}`);
  }

  if (argumentParts.length === 0) {
    return "";
  }

  return `(${argumentParts.join(", ")})`;
}

export function buildLayoutShell(layout: Readonly<LayoutConfig>): LayoutShell {
  return {
    openingLine: `${layout.type}${buildLayoutArguments(layout)} {`,
    closingLine: "}",
  };
}

export function buildLayoutContainer(layout: Readonly<LayoutConfig>, childBody: string): string {
  const shell = buildLayoutShell(layout);
  return `${shell.openingLine}\n${childBody}\n${shell.closingLine}`;
}
