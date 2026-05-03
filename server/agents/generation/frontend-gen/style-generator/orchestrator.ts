import { buildAccessibilityStyles } from "./agents/accessibility-style.agent.js";
import { buildAnimationStyles } from "./agents/animation-style.agent.js";
import { defineBreakpoints, detectBreakpoint } from "./agents/breakpoint-manager.agent.js";
import { buildColorSystem } from "./agents/color-system.agent.js";
import { resolveThemeMode } from "./agents/dark-mode.agent.js";
import { buildLayoutSystem } from "./agents/layout-system.agent.js";
import { mapResponsiveStyles } from "./agents/responsive-engine.agent.js";
import { buildSpacingScale } from "./agents/spacing-scale.agent.js";
import { buildStylesheet } from "./agents/stylesheet-builder.agent.js";
import { generateThemeTokens } from "./agents/theme-generator.agent.js";
import { buildTypographyScale } from "./agents/typography-scale.agent.js";
import { createStyleGeneratorState } from "./state.js";
import type { StyleGeneratorInput, StyleGeneratorResult } from "./types.js";
import { deepFreeze } from "./utils/deep-freeze.util.js";
import { validateStyleGeneratorInput } from "./utils/validation.util.js";

export function generateResponsiveStyleSystem(input: StyleGeneratorInput): StyleGeneratorResult {
  if (!validateStyleGeneratorInput(input)) {
    throw new Error("Invalid style generator input.");
  }

  const logs: string[] = [];

  const breakpoints = defineBreakpoints();
  const activeBreakpoint = detectBreakpoint(input.viewportWidth, breakpoints);
  logs.push("breakpoint-manager: detected screen size rules");

  const responsive = mapResponsiveStyles(breakpoints, activeBreakpoint);
  logs.push("responsive-engine: applied responsive mapping");

  const layout = buildLayoutSystem(activeBreakpoint);
  logs.push("layout-system: generated layout system");

  const spacing = buildSpacingScale();
  logs.push("spacing-scale: generated spacing scale");

  const typography = buildTypographyScale(input.baseFontPx ?? 16);
  logs.push("typography-scale: generated typography scale");

  const colors = buildColorSystem();
  logs.push("color-system: generated color system");

  const mode = resolveThemeMode(input.themeMode);
  const theme = generateThemeTokens(colors, mode);
  logs.push("theme-generator: generated theme tokens");

  logs.push("dark-mode: resolved theme mode");

  const accessibility = buildAccessibilityStyles(Boolean(input.highContrast));
  logs.push("accessibility-style: enforced contrast and readability");

  const animation = buildAnimationStyles(Boolean(input.prefersReducedMotion));
  logs.push("animation-style: generated transitions and micro-interactions");

  const stylesheet = buildStylesheet(layout, spacing, typography, theme, accessibility, animation);

  const state = createStyleGeneratorState(mode, activeBreakpoint);

  const data = deepFreeze({
    breakpoints,
    layout,
    typography,
    spacing,
    colors,
    theme,
    accessibility,
    responsive,
    animation,
    stylesheet,
    state,
  });

  return deepFreeze({
    success: true,
    logs: Object.freeze(logs),
    data,
  });
}
