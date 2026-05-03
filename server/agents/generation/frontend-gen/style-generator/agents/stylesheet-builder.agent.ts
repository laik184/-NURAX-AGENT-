import type {
  AccessibilitySystem,
  AnimationSystem,
  LayoutSystem,
  SpacingSystem,
  ThemeSystem,
  TypographySystem,
} from "../types.js";

export function buildStylesheet(
  layout: LayoutSystem,
  spacing: SpacingSystem,
  typography: TypographySystem,
  theme: ThemeSystem,
  accessibility: AccessibilitySystem,
  animation: AnimationSystem,
): string {
  return [
    `:root { --container-max: ${layout.containerMaxWidth}; --focus-ring: ${accessibility.focusRing}; }`,
    `body { font-family: ${typography.fontFamily}; background: ${theme.tokens["--bg"]}; color: ${theme.tokens["--text"]}; }`,
    `.container { max-width: var(--container-max); margin: 0 auto; padding: ${spacing.scale["3"]}; }`,
    `.interactive { transition: all ${animation.durationNormal} ${animation.easingStandard}; }`,
  ].join("\n");
}
