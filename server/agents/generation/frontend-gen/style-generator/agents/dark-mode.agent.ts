import type { ThemeMode } from "../types.js";

export function resolveThemeMode(preferred?: ThemeMode): ThemeMode {
  return preferred === "dark" ? "dark" : "light";
}
