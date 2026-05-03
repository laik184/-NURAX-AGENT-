import type { TypographySystem } from "../types.js";
import { pxToRem } from "../utils/unit-converter.util.js";

export function buildTypographyScale(baseFontPx = 16): TypographySystem {
  return Object.freeze({
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    scale: Object.freeze({
      xs: pxToRem(baseFontPx * 0.75),
      sm: pxToRem(baseFontPx * 0.875),
      md: pxToRem(baseFontPx),
      lg: pxToRem(baseFontPx * 1.125),
      xl: pxToRem(baseFontPx * 1.25),
      "2xl": pxToRem(baseFontPx * 1.5),
    }),
    lineHeight: Object.freeze({
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    }),
  });
}
