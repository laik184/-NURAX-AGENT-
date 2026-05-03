import type { ComponentPlan, GeneratedFile } from "../types.js";
import { buildFilePath } from "../utils/file-structure.util.js";
import { formatCode } from "../utils/formatter.util.js";

export function generateExportFile(plan: Readonly<ComponentPlan>): GeneratedFile {
  const source = plan.framework === "vue"
    ? `export { default as ${plan.normalizedName} } from "./${plan.componentFileName}";`
    : `export * from "./${plan.componentFileName.replace(/\.tsx$/, "")}";`;

  return Object.freeze({
    path: buildFilePath(plan, plan.exportFileName),
    content: formatCode(source),
    language: "ts",
  });
}
