import type { ComponentPlan, GeneratedFile } from "../types.js";
import { buildFilePath } from "../utils/file-structure.util.js";
import { formatCode } from "../utils/formatter.util.js";

export function generateStyleFile(plan: Readonly<ComponentPlan>): GeneratedFile | null {
  if (plan.styleStrategy !== "css" || !plan.styleFileName) {
    return null;
  }

  const content = formatCode(`
.${plan.normalizedName} {
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  background-color: #ffffff;
  padding: 1rem;
}
`);

  return Object.freeze({
    path: buildFilePath(plan, plan.styleFileName),
    content,
    language: "css",
  });
}
