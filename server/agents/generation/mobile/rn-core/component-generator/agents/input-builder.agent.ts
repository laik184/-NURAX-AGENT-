import { buildAccessibilityProps } from "../utils/accessibility.util.js";
import { buildComponentTemplate } from "../utils/component-template.util.js";

export function buildInputComponent(props: Readonly<Record<string, unknown>>): string {
  const accessibility = buildAccessibilityProps(props, "Text input", "search");

  const inputProps = {
    ...props,
    ...accessibility,
    placeholderTextColor: props.placeholderTextColor ?? "#9CA3AF",
    autoCapitalize: props.autoCapitalize ?? "none",
    onChangeText: props.onChangeText ?? "handleChange",
  };

  return buildComponentTemplate("TextInput", inputProps);
}
