import type { NavigationConfig } from "../types.js";
import { indentBlock } from "../utils/swift-syntax.util.js";

export function attachNavigation(code: string, navigation: Readonly<NavigationConfig>): string {
  if (!navigation.enabled) {
    return code;
  }

  const titleModifier = navigation.title ? `.navigationTitle("${navigation.title}")` : "";

  if (navigation.useNavigationLink && navigation.destinationView) {
    const destination = `${navigation.destinationView}()`;

    const content = [
      "NavigationStack {",
      "  NavigationLink {",
      `    ${destination}`,
      "  } label: {",
      indentBlock(code, 2),
      "  }",
      "}",
      titleModifier,
    ]
      .filter(Boolean)
      .join("\n");

    return content;
  }

  return ["NavigationStack {", indentBlock(code), "}", titleModifier].filter(Boolean).join("\n");
}
