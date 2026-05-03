import type { AccessibilitySystem } from "../types.js";

export function buildAccessibilityStyles(highContrast = false): AccessibilitySystem {
  return Object.freeze({
    minContrastRatio: highContrast ? 7 : 4.5,
    readability: highContrast ? "AAA" : "AA",
    focusRing: highContrast ? "0 0 0 3px #FACC15" : "0 0 0 2px #2563EB",
  });
}
