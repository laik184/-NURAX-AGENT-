import type { StyleGeneratorInput } from "../types.js";

export function validateStyleGeneratorInput(input: StyleGeneratorInput): boolean {
  return Number.isFinite(input.viewportWidth) && input.viewportWidth > 0;
}
