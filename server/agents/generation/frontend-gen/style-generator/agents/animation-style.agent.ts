import type { AnimationSystem } from "../types.js";

export function buildAnimationStyles(prefersReducedMotion = false): AnimationSystem {
  return Object.freeze({
    durationFast: prefersReducedMotion ? "0ms" : "120ms",
    durationNormal: prefersReducedMotion ? "0ms" : "240ms",
    easingStandard: "cubic-bezier(0.2, 0, 0, 1)",
    enabled: !prefersReducedMotion,
  });
}
