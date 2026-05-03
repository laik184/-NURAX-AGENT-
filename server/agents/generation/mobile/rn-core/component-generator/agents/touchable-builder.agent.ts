import { buildAccessibilityProps } from "../utils/accessibility.util.js";
import { buildComponentTemplate } from "../utils/component-template.util.js";

export function buildTouchableComponent(props: Readonly<Record<string, unknown>>): string {
  const accessibility = buildAccessibilityProps(props, "Button", "button");
  const variant = typeof props.variant === "string" ? props.variant : "touchable-opacity";

  if (variant === "pressable") {
    return buildComponentTemplate("Pressable", { ...props, ...accessibility }, "\n  <Text>Press Me</Text>\n");
  }

  if (variant === "button") {
    return buildComponentTemplate("Button", { ...props, ...accessibility });
  }

  return buildComponentTemplate(
    "TouchableOpacity",
    { ...props, ...accessibility },
    "\n  <Text>Tap Me</Text>\n",
  );
}
