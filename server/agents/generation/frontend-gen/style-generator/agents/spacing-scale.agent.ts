import type { SpacingSystem } from "../types.js";
import { pxToRem } from "../utils/unit-converter.util.js";

export function buildSpacingScale(basePx = 4): SpacingSystem {
  return Object.freeze({
    scale: Object.freeze({
      "1": pxToRem(basePx),
      "2": pxToRem(basePx * 2),
      "3": pxToRem(basePx * 4),
      "4": pxToRem(basePx * 6),
      "5": pxToRem(basePx * 8),
    }),
  });
}
