export type AccessibilityRole =
  | "none"
  | "button"
  | "text"
  | "image"
  | "header"
  | "summary"
  | "link"
  | "search"
  | "keyboardkey"
  | "adjustable"
  | "imagebutton";

export function buildAccessibilityProps(
  props: Readonly<Record<string, unknown>>,
  fallbackLabel: string,
  fallbackRole: AccessibilityRole,
): Readonly<Record<string, unknown>> {
  const accessibilityLabel =
    typeof props.accessibilityLabel === "string" && props.accessibilityLabel.trim().length > 0
      ? props.accessibilityLabel.trim()
      : fallbackLabel;

  const accessibilityRole =
    typeof props.accessibilityRole === "string" && props.accessibilityRole.trim().length > 0
      ? props.accessibilityRole.trim()
      : fallbackRole;

  return Object.freeze({
    accessibilityLabel,
    accessibilityRole,
    accessible: props.accessible ?? true,
  });
}
