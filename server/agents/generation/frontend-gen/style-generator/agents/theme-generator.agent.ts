import type { ColorSystem, ThemeMode, ThemeSystem } from "../types.js";

export function generateThemeTokens(colors: ColorSystem, mode: ThemeMode): ThemeSystem {
  const tokens =
    mode === "dark"
      ? {
          "--bg": "#020617",
          "--surface": "#0F172A",
          "--text": "#E2E8F0",
          "--primary": colors.primary,
        }
      : {
          "--bg": colors.background,
          "--surface": colors.surface,
          "--text": colors.text,
          "--primary": colors.primary,
        };

  return Object.freeze({
    mode,
    tokens: Object.freeze(tokens),
  });
}
