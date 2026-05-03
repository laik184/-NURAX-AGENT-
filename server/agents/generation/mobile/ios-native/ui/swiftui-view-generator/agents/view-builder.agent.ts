import { indentBlock } from "../utils/swift-syntax.util.js";

export function buildRootView(viewName: string, declarations: string, bodyContent: string): string {
  const declarationBlock = declarations.length ? `${indentBlock(declarations)}\n\n` : "";

  return [
    "import SwiftUI",
    "",
    `struct ${viewName}: View {`,
    declarationBlock,
    "  var body: some View {",
    indentBlock(bodyContent, 2),
    "  }",
    "}",
  ]
    .filter((segment) => segment !== "")
    .join("\n");
}
