import { buildAccessibilityProps } from "../utils/accessibility.util.js";
import { buildComponentTemplate } from "../utils/component-template.util.js";

export function buildTextComponent(props: Readonly<Record<string, unknown>>): string {
  const accessibility = buildAccessibilityProps(props, "Text element", "text");
  const content = typeof props.children === "string" ? props.children : "Generated Text";

  return buildComponentTemplate("Text", { ...props, ...accessibility }, content);
}
