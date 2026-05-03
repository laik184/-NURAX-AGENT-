import type { ComponentPlan } from "../types.js";
import { loadTemplate } from "../utils/template-loader.util.js";

export function selectTemplate(plan: Readonly<ComponentPlan>): string {
  return loadTemplate(plan);
}
