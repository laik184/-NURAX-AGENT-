import type { NavigationConfig } from "../types.js";
import { indentLines } from "../utils/swift-syntax.util.js";

export function generateNavigation(content: string, config?: Readonly<NavigationConfig>): string {
  const titleModifier = config?.title ? `.navigationTitle("${config.title}")` : "";

  if (config?.useNavigationStack === false) {
    return [content, titleModifier].filter(Boolean).join("\n");
  }

  return ["NavigationStack {", indentLines(content), "}", titleModifier].filter(Boolean).join("\n");
}
