import { buildAccessibilityProps } from "../utils/accessibility.util.js";
import { buildComponentTemplate } from "../utils/component-template.util.js";

export function buildIconComponent(props: Readonly<Record<string, unknown>>): string {
  const accessibility = buildAccessibilityProps(props, "Icon", "image");

  const iconProps = {
    ...props,
    ...accessibility,
    name: props.name ?? "home",
    size: props.size ?? 24,
    color: props.color ?? "#111827",
  };

  return buildComponentTemplate("Icon", iconProps);
}
