import { buildAccessibilityProps } from "../utils/accessibility.util.js";
import { buildComponentTemplate } from "../utils/component-template.util.js";

export function buildModalComponent(props: Readonly<Record<string, unknown>>): string {
  const accessibility = buildAccessibilityProps(props, "Modal", "summary");
  const modalProps = {
    ...props,
    ...accessibility,
    animationType: props.animationType ?? "fade",
    transparent: props.transparent ?? true,
  };

  return buildComponentTemplate(
    "Modal",
    modalProps,
    "\n  <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} />\n",
  );
}
